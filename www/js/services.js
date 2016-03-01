// Global Functions
function dataURLtoBlob(dataURI) {
  var binary = atob(dataURI.split(',')[1]);
  var array = [];
  for(var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
}

angular.module('vida.services', ['ngCordova', 'ngResource'])


.factory('httpRequestInterceptor', function(configService, $q, $cordovaToast, utilService, $injector) {
  var interceptor_ = {
    request: function (config) {
      var deferred = $q.defer();

      if (config.url.indexOf('http') === 0 && configService.isReady() && configService.getConfig()) {
        console.log('----[ intercepted external: ', config);

        if (configService.getServerURL()) {
          var addAuthHeader = function() {
            if (!config.headers) {
              //TODO: ever hit?
              config.headers = {};
            }
            config.headers.Authorization = auth;
            deferred.resolve(config);
          };

          // set max timeout since if creds are not valid for endpoint with basic auth, it will go for 90 secs or whatever
          // the large default is.
          if (typeof config.timeout === 'undefined') {
            config.timeout = 10000;
          }

          var auth = configService.getAuthorizationBest();
          if (auth) {
            addAuthHeader();
          } else {
            // allow the request go through without automatically attaching auth header / throwing an error
            if (config.headers && config.headers.skipInterceptorAuthCheck) {
              delete config.skipInterceptorAuthCheck;
              deferred.resolve(config);
            } else {
              deferred.reject();
            }
            /*
            var loginService = $injector.get('loginService');
            loginService.loginDjangoGoogleOauth().then(function () {
              $cordovaToast.showShortBottom('Authorization suceeded');
              addAuthHeader();
            }, function () {
              console.log('==== authorization failed! ====');
              deferred.reject(config);
            });
            */
          }
        } else {
          deferred.reject();
        }
      } else {
        deferred.resolve(config);
      }

      return deferred.promise;
    },

    responseError: function(rejection) {
      if (!utilService.isConnected()) {
        $cordovaToast.showShortTop('No Connectivity');
      } else if (!configService.getServerURL()) {
        $cordovaToast.showShortTop('Server Not Specified, please specify through settings tab');
      } else if (!configService.getAuthorizationBest()) {
        $cordovaToast.showShortTop('Missing Authorization, please authorize through settings tab');
      } else if (rejection.status === 401) {
        $cordovaToast.showShortTop('Unauthorized, please check authorization through settings tab');
      } else if (rejection.status === 404) {
        $cordovaToast.showShortTop('Server Not Found, please check server & protocol on settings tab ');
      } else if (rejection.status === 0) {
        $cordovaToast.showShortTop('Error, please check server & protocol on settings tab ');
      } else {
        var msg = 'Error Performing Request.';
        if (typeof rejection !== 'undefined' && rejection &&
          typeof rejection.statusText !== 'undefined' && rejection.statusText) {
          msg += ' Status: ' + rejection.statusText + '.';
        }
        if (typeof rejection !== 'undefined' && rejection &&
          typeof rejection.config !== 'undefined' && rejection.config &&
          typeof rejection.config.url !== 'undefined' && rejection.config.url) {
          msg += ' Url: ' + rejection.config.url;
        }
        $cordovaToast.showShortTop(msg);
      }
      return $q.reject(rejection);
    },

    response: function (response) {
      if (response.status === 401) {
        $cordovaToast.showShortTop('Unauthorized request, response ');
      }
      return response || $q.when(response);
    }
  };

  return interceptor_;
})

.config(function($interpolateProvider, $httpProvider, $resourceProvider) {
  $httpProvider.interceptors.push('httpRequestInterceptor');
  //$interpolateProvider.startSymbol('{[');
  //$interpolateProvider.endSymbol(']}');
  //$httpProvider.defaults.xsrfCookieName = 'csrftoken';
  //$httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
  //$httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  //$httpProvider.defaults.headers.common['X-Auth-Token'] = undefined;

  $resourceProvider.defaults.stripTrailingSlashes = false;
})

.factory('Camera', ['$q', function($q){
  return {
    getPicture: function(options) {
      var q = $q.defer();
      navigator.camera.getPicture(function(result) {
        q.resolve(result);
      }, function(err) {
        q.reject(err);
      }, options);
      return q.promise;
    }
  };
}])

//TODO: report service should have get [db] ,  pull [server], push [server]. it should use a new fileService
//      for media etc. fileService should have save, load, pull, push as well.
.service('mediaService', function($http, configService, $q, geolocationService, $cordovaFileTransfer, localDBService,
                                   utilService, $cordovaFile) {
  var service_ = this;

  this.pushMedia = function() {
    var deferred = $q.defer();
    localDBService.getAllRows('media').then(function (result) {
      var fileHashAndPaths = localDBService.getAllRowsKVArrays(result);
      // upload pics one at a time ("Sync") to be bandwidth conscious
      utilService.foreachWaitForCompletionSync(fileHashAndPaths, service_.uploadAndRemoveMedia).then(function(resp) {
        if (resp.failed.length === 0) {
          deferred.resolve();
        } else {
          console.log('failed media: ', resp.failed);
          console.log('succeeded media: ', resp.succeeded);
          deferred.reject(resp);
        }
      }, function (eFileTransfer) {
        deferred.reject();
      });
    }, function () {
      utilService.notify('failed to get media from local db');
      deferred.reject();
    });

    return deferred.promise;
  };

  // upload media in the provided array
  this.uploadAndRemoveMedia = function(fileHash, filePath) {
    var deferred = $q.defer();

    var onError = function(e){
      console.log('====[ uploadAndRemoveMedia Failed for: ', fileHash, filePath, 'Error: ', e);
      deferred.reject(fileHash);
    };

    service_.uploadFile(configService.getFileServiceURL(), fileHash, filePath).then(function(response) {
      localDBService.removeKey('media', fileHash).then(function () {
        var localFileInfo = utilService.getFilePathComponents(filePath);
        $cordovaFile.removeFile(localFileInfo.dir, localFileInfo.filename).then(function(){
          console.log('----[ uploadMedia & removing completed for: ', fileHash, filePath);
          deferred.resolve(response);
        }, onError);
      }, onError);
    }, onError);

    return deferred.promise;
  };

  this.uploadFile = function(url, filename, filePath) {
    var deferred = $q.defer();
    var options = new FileUploadOptions();
    options.fileKey = 'file';
    options.fileName = filename;
    options.headers = {
      'Authorization': configService.getAuthorizationBest()
    };
    var fileInfo = utilService.getFilePathComponents(filePath);
    $cordovaFile.checkFile(fileInfo.dir, fileInfo.filename).then(function(){
      $cordovaFileTransfer.upload(url, filePath, options).then(function(response) {
        deferred.resolve(response);
      }, function(e) {
        console.log('----[ uploadMedia.$cordovaFileTransfer error. http_status: ', e.http_status, e);
        utilService.notify('failed to upload a media: ' + filename);
        deferred.reject(e);
      });
    }, function() {
      utilService.notify('media not found: ' + filename);
      deferred.reject('media not found');
    });

    return deferred.promise;
  };
})

.service('reportService', function($http, configService, $q, geolocationService, localDBService, formService) {
  var service_ = this;
  var reports_ = [];

  this.get = function() {
    return reports_;
  };

  this.load = function() {
    var deferred = $q.defer();
    localDBService.getAllRows('reports').then(function (result) {
      var reports = localDBService.getAllRowsValues(result, true);
      reports_ = reports;
      deferred.resolve(reports_);
    }, function() {
      deferred.reject();
    });
    return deferred.promise;
  };

  this.add = function(report) {
    console.log('----[ reportService.add: ', report);
    var deferred = $q.defer();

    localDBService.insertValue('reports', report).then(function() {
      reports_.push(report);
      deferred.resolve(reports_);
    }, function () {
      deferred.reject();
    });

    return deferred.promise;
  };

  this.remove = function(report) {
    console.log('----[ reportService.remove: ', report);
    var deferred = $q.defer();

    localDBService.removeValue('reports', report).then(function() {
      reports_ = reports_.filter(function(e) {
        return !angular.equals(e, report);
      });
      deferred.resolve();
    }, function () {
      deferred.reject();
    });

    return deferred.promise;
  };

  // TODO: rename to push and it shouldn't take any params. move some of the code from sync here
  this.uploadReport = function(report) {
    var deferred = $q.defer();
    delete report.timestamp_local; // is was a temp key not meant for server
    report = JSON.stringify(report);
    console.log('----[ posintg report: ', report );
    $http.post(configService.getReportURL(), report, {
      transformRequest: angular.identity
    }).then(function() {
      deferred.resolve();
    }, function(e) {
      deferred.reject(e);
    });
    return deferred.promise;
  };

  this.hasMedia = function(report) {
    var media = service_.getMedia(report);
    return media && media.length > 0;
  };

  this.getMedia = function(report) {
    var form = formService.getByUri(report.form);
    return report.data[formService.getMediaPropName(form)];
  };

  this.getMediaFilePathByIndex = function(report, index) {
    var media = service_.getMedia(report);
    return cordova.file.dataDirectory + media[index];
  };

  this.getMediaFilePathByMediaHash = function(report, mediaHash) {
    var media = service_.getMedia(report);
    for(var i = 0; i < media.length; i++) {
      if (media[i] === mediaHash)
        return service_.getMediaFilePathByIndex(report, i);
    }
  };

  this.getNew = function(form) {
    var report = {
      'data': {},
      'status': 'SUBMITTED',
      'form': form.resource_uri,
      'timestamp_local': null, // not sent to the server
      'geom': null
    };
    if (formService.getMediaPropName(form)) {
      report.data[formService.getMediaPropName(form)] = [];
    }
    return report;
  };

})

.service('utilService', function($cordovaFile, $q, $cordovaToast) {
  var service_ = this;

  this.isConnected = function() {
    return navigator.connection.type !== Connection.NONE;
  };

  this.getFilePathComponents = function(filePath) {
    var info = {
      filename: null,
      ext: null,
      dir: null
    };

    if (filePath) {
      var lastSlashIndex = filePath.lastIndexOf("/");
      info.dir = filePath.substring(0, lastSlashIndex);
      info.filename = filePath.substring(lastSlashIndex + 1);
      var lastDotIndex = info.filename.lastIndexOf(".");
      info.ext = info.filename.substring(lastDotIndex + 1);
    }
    return info;
  };

  // given a full file path, get the binary data in the file
  this.getFileAsBinaryString = function(filePath, encodeAsBase64) {
    var deferred = $q.defer();
    var fileInfo = service_.getFilePathComponents(filePath);
    $cordovaFile.readAsBinaryString(fileInfo.dir, fileInfo.filename).then(function(data) {
      if (encodeAsBase64) {
        deferred.resolve(btoa(data));
      } else {
        deferred.resolve(data);
      }
    }, function(err) {
      deferred.reject(err);
    });
    return deferred.promise;
  };

  this.notify = function(msg) {
    console.log('===[ utilService, notify: ', msg);
    $cordovaToast.showLongBottom(msg);
  };

  this.getSHA1 = function(data, stringify) {
    if (typeof data !== 'string' && stringify) {
      data = JSON.stringify(data);
    }
    var sha1 = new jsSHA("SHA-1", "BYTES");
    sha1.update(data);
    return sha1.getHash("HEX");
  };

  this.getSHA1Random = function() {
    return service_.getSHA1(Math.round(Math.random() * Math.pow(2, 48)));
  };

  this.foreachWaitForCompletionSync = function(array, operation) {
    if (!array) {
      array = [];
    }
    var deferred = $q.defer();
    var itemsFailed = [];
    var itemsSucceededResponse = [];

    var onCompleted = function (succeeded, reponse) {
      var completed = array.pop();
      if (succeeded) {
        itemsSucceededResponse.push(reponse);
      } else {
        itemsFailed.push(completed);
      }
      if (array.length === 0) {
        deferred.resolve({
          succeeded: itemsSucceededResponse,
          failed: itemsFailed
        });
      } else {
        uploadAnother();
      }
    };

    var uploadAnother = function () {
      if (array.length > 0) {
        operation.apply(this, array.slice(-1).pop()).then(function (data) {
          onCompleted(true, data);
        }, function (resp) {
          console.log('----[ foreachWaitForCompletionSync.uploadAnother, operation resp: ', resp);
          onCompleted(false, resp);
        });
      } else {
        // assume success, no failed files and no new filenames
        deferred.resolve({
          succeeded: [],
          failed: []
        });
      }
    };

    uploadAnother();
    return deferred.promise;
  };
})


.factory('geolocationService', function ($q, $timeout, utilService) {
  // if call has been made in the past 1 second, don't hit the api
  var currentPositionCache;

  return {
    getCurrentPosition: function () {
      if (!currentPositionCache) {
        var deferred = $q.defer();
        navigator.geolocation.getCurrentPosition(function (position) {
          currentPositionCache = position;
          deferred.resolve(currentPositionCache);
          $timeout(function () {
            currentPositionCache = undefined;
          }, 1000);
        }, function(e) {
          console.log('failed to get geolocation: ', e);
          utilService.notify('failed to retrieve geolocation.');
          deferred.reject(e);
        },
        {
          maximumAge: 8000,
          timeout: 10000,
          enableHighAccuracy: true
        });
        return deferred.promise;
      }
      return $q.when(currentPositionCache);
    },
    positionToWKT: function(position) {
      return "SRID=4326;POINT (" + position.coords.longitude + " " + position.coords.latitude + ")";
    }
  };
})


.service('trackerService', function($http, $q, configService, geolocationService, utilService) {
  this.push = function (position, mayday) {
    var deferred = $q.defer();

    var payload = {
      'mayday': mayday,
      'geom': {
        'coordinates': [
          position.coords.longitude,
          position.coords.latitude
        ],
        'type': 'Point'
      },
      'user': configService.getConfig().username
    };

    $http.post(configService.getTrackURL(), payload).then(function(data) {
      // console.log('----[ trackerService.success: ', data);
      deferred.resolve();
    }, function(error) {
      console.log('----[ trackerService.error: ', error);
      utilService.notify('error posting track ', error);
      deferred.reject(error);
    });

    return deferred.promise;
  };
})

.service('loginService', function($http, $q, configService, $cordovaToast, $filter, $cordovaOauth) {
  this.loginDjango = function (username, password) {
    var deferred = $q.defer();

    configService.resetAuthorizationApiKey();

    var onSuccess = function() {
      console.log('----[ django basic auth log in worked');
      configService.saveConfig();
      deferred.resolve();
    };

    var onError = function(e) {
      console.log('------ django basic auth error', e);
      deferred.reject();
    };

    $http.get(configService.getAuthenticationURLBasicAuth(),
      {
        "headers": {
          "Content-Type": ''
          // interceptor will add username pass basic auth since apikey was reset
        }
      }).then(
      function(result) {
        console.log('------ login success: ', result);
        if (result.status === 200) {
          onSuccess();
        } else {
          onError();
        }
      }, onError);
    return deferred.promise;
  };

  this.loginAjax = function (username, password) {
    var deferred = $q.defer();

    $.ajax({
      type: 'GET',
      url: configService.getAuthenticationURLBasicAuth(),

      // ****************        syncronous call!        *****************
      // with basic auth, when the credentials are wrong, the app doesn't get a 401 as the 'browser'/webview is supposed
      // to popup the basic auth dialog for user to retry which doesn't work on mobile. This means the request attempt
      // stays active until the timeout duration is hit at which point you still dont see the 401 and just a timeout.
      // when call is NOT async, you get the 401. The app will 'hang' for a bit of course...
      async: false,
      timeout: 3000,

      "headers": {
        "Content-Type": ''
      }
    }).done(function(data, textStatus, xhr) {
      console.log('----[ ajax.done: ', xhr);
      if (xhr.status === 200) {
        deferred.resolve(data);
      } else {
        deferred.reject(xhr);
      }
    }).fail(function(xhr, textStatus, errorThrown) {
      console.log('----[ ajax.fail: ', xhr);
      if (xhr.status === 404) {
        $cordovaToast.showShortBottom(($filter('translate')('error_server_not_found')));
      } else if (xhr.status === 401) {
        $cordovaToast.showShortBottom(($filter('translate')('error_wrong_credentials')));
      } else {
        $cordovaToast.showShortBottom($filter('translate')('error_connecting_server'));
      }
      deferred.reject(xhr);
    }).always(function(a, status, c) {
      console.log('----[ ajax.always: ', c);
    });

    return deferred.promise;
  };

  this.loginGoogle = function() {
    var deferred = $q.defer();
    $cordovaOauth.google(configService.getConfig().google.client_id, configService.getConfig().google.scopes).then(function(result) {
      console.log("----[ google oauth: ", result);
      configService.getConfig().google.access_token = result.access_token;
      $http.get(configService.getAuthenticationURLApiKey() , {
        headers: {
          skipInterceptorAuthCheck: true, // app specific to avoid throwing an error when there is no valid
                                          // Authorize header can be added based on configService.getAuthorizationBest()
          access_token: configService.getConfig().google.access_token
        }
      }).then(function(res){
        console.log('----[ django api key: ', res);
        configService.getConfig().username = res.data.username;
        configService.getConfig().django.apikey = res.data.apikey;
        deferred.resolve();
        configService.saveConfig();
      }, function(error) {
        console.log('====[ error getting django api key: ', error);
        $cordovaToast.showShortBottom(($filter('translate')('error_could_not_get_django_apikey')));
        deferred.reject(error);
      });
    }, function(error) {
      console.log("====[ google oauth error: ", error);
      configService.getConfig().access_token = null;
      $cordovaToast.showShortBottom('Could not authenticate with google');
      deferred.reject(error);
    });
    return deferred.promise;
  };
})

.service('formService', function($http, $q, configService, $resource, localDBService) {
  var service_ = this;
  var forms_ = [];

  //TODO: remove current form let each controller controller use its own
  var currentForm_ = null;

  this.pullFroms = function() {
    var formResource = $resource(configService.getFormURL() + ':id', {}, {
      query: {
        method: 'GET',
        timeout: 10000,
        isArray: true,
        transformResponse: $http.defaults.transformResponse.concat([
          function (data, headersGetter) {
            service_.setForms(data.objects);
            return data.objects;
          }
        ])
      }
    });

    return formResource.query().$promise;
  };

  this.getById = function(id) {
    for(var i = 0; i < forms_.length; i++) {
      if (i == id) // accept int or string
        return forms_[i];
    }
  };

  this.getByUri = function(uri) {
    for(var i = 0; i < forms_.length; i++) {
      if (forms_[i].resource_uri === uri)
        return forms_[i];
    }
  };

  this.uriToId = function(uri) {
    for(var i = 0; i < forms_.length; i++) {
      if (forms_[i].resource_uri === uri)
        return i;
    }
  };

  this.getCurrentForm = function() {
    return currentForm_;
  };

  this.setCurrentForm = function(id) {
    currentForm_ = forms_[id];
  };

  this.setCurrentFormById = function(id) {
    currentForm_ = forms_[id];
  };

  this.getForms = function() {
    return forms_;
  };

  this.setForms = function(forms) {
    if (typeof forms !== 'undefined' && forms) {
      for (var i = 0; i < forms.length; i++) {
        var form = forms[i];
        if (typeof forms[i].schema === 'string') {
          forms[i].schema = JSON.parse(forms[i].schema);
        }
      }
      forms_ = forms;
    } else {
      forms_ = [];
    }
  };

  this.saveForms = function() {
    var deferred = $q.defer();
    var promises = [];
    localDBService.removeAllKeys('forms').then(function() {
      for (var i = 0; i < forms_.length; i++) {
        promises.push(localDBService.insertValue('forms', forms_[i]));
      }
    });
    $q.all(promises).then(function(){
      deferred.resolve();
    }, function() {
      deferred.reject();
    });
    return deferred.promise;
  };

  this.loadForms = function() {
    localDBService.getAllRows('forms').then(function (result) {
      service_.setForms(localDBService.getAllRowsValues(result, true), false);
    });
  };

  this.getMediaPropName = function(form) {
    if ('photos' in form.schema.properties)
      return 'photos';
    if ('Photos' in form.schema.properties)
      return 'Photos';
  };
})

.service('shelterService', function($http, configService, $resource, $q) {
  var service = this;
  var shelters = [];
  var current_shelter = {};
  current_shelter.str = 'None';
  current_shelter.link = 'None';

  this.getAll = function() {
    var shelter = $resource(configService.getShelterURL() + ':id', {}, {
      query: {
        method: 'GET',
        isArray: true,
        transformResponse: $http.defaults.transformResponse.concat([
          function (data, headersGetter) {
            shelters = data.objects;
            console.log('----[ transformResponse data: ', data);
            return data.objects;
          }
        ])
      }
    });

    return shelter.query().$promise;
  };

  this.getById = function(id) {
    for(var i = 0; i < shelters.length; i++) {
      if (shelters[i].id == id)
        return shelters[i];
    }
  };

  this.getCurrentShelter = function() {
    return current_shelter;
  };

  this.setCurrentShelter = function(shelter){
    if (shelter !== 'None') {
      current_shelter.str = shelter.name;
      current_shelter.link = '#/vida/shelter-search/shelter-detail/' + shelter.id;
    } else {
      current_shelter.str = 'None';
      current_shelter.link = 'None';
    }
  };

  this.getLatLng = function(id) {
    var shelter = service.getById(id);
    // look for 'point' in wkt and get the pair of numbers in the string after it
    var trimParens = /^\s*\(?(.*?)\)?\s*$/;
    var coordinateString = shelter.geom.toLowerCase().split('point')[1].replace(trimParens, '$1').trim();
    var tokens = coordinateString.split(' ');
    var lng = parseFloat(tokens[0]);
    var lat = parseFloat(tokens[1]);
    return {lat: lat, lng: lng};
  };

  this.printToConsole = function() {
    for (var i = 0; i < peopleInShelter.length; i++) {
      console.log(peopleInShelter[i].given_name);
    }
  };
})

.service('configService', function(localDBService, $q) {
  var service_ = this;
  var isReady_ = false;

  // when the application is first installed & launched, these settings will be used.
  var initialConfig_ = {
    //serverURL: '192.168.33.15',
    //serverURL: 'flintlock-load-balancer-521350804.eu-central-1.elb.amazonaws.com',
    serverURL: null,
    username: null,
    password: null,
    protocol: {
      'name': 'Http',
      'value': 'http'
    },
    language: {
      'name': 'settings_language_english',
      'value': 'English'
    },
    syncLastSuccess: null,
    trackingLastSuccess: null,
    google: {
      access_token: null,
      client_id: '904279578897-fct0kbo7e8gaa2me2o39655ceoh71v8d.apps.googleusercontent.com',
      //client_id: '870172265350-qpj5qtn1vddqqkqpbsjhseifehb4j9g3.apps.googleusercontent.com',
      scopes: ['openid', 'email', 'profile']
    },
    django: {
      apikey: null
    }
  };

  // the current config. Often has been modified by user and loaded from db
  var config_ = null;

  this.loadConfig = function() {
    var deferred = $q.defer();
    localDBService.getKey('properties', 'config', true).then(function(configFromDB){
      config_ = $.extend({}, initialConfig_);
      config_ = $.extend( config_, configFromDB );
      console.log('loaded config: ', config_);
      isReady_ = true;
      deferred.resolve();
    }, function() {
      deferred.reject();
    });
    return deferred.promise;
  };

  this.saveConfig = function() {
    localDBService.setKey('properties', 'config', config_).then(function(){
      console.log('saved config: ', config_);
    });
  };

  this.isReady = function() {
    return isReady_;
  };

  // watch and auto-save?
  this.getConfig = function() {
    return config_;
  };

  this.resetAuthorizationConfig = function() {
    service_.resetAuthorizationGoogle();
    service_.resetAuthorizationApiKey();
    service_.resetAuthorizationBasicAuth();
  };

  this.resetAuthorizationGoogle = function() {
    var initConfigClone = $.extend({}, initialConfig_);
    config_.google = initConfigClone.google;
  };

  this.resetAuthorizationApiKey = function() {
    var initConfigClone = $.extend({}, initialConfig_);
    config_.django = initConfigClone.django;
  };

  this.resetAuthorizationBasicAuth = function() {
    var initConfigClone = $.extend({}, initialConfig_);
    config_.username = initConfigClone.username;
    config_.password = initConfigClone.password;
  };

  this.getAuthorizationBasicAuth = function() {
    return 'Basic ' + btoa(config_.username + ':' + config_.password);
  };

  this.getAuthorizationApiKey = function() {
    if (config_ && config_.username && config_.django.apikey) {
      return 'ApiKey ' + config_.username + ':' + config_.django.apikey;
    }
    return null;
  };

  this.getAuthorizationBest = function() {
    if (config_ && config_.username) {
      if (config_.django.apikey) {
        return service_.getAuthorizationApiKey();
      } else if(config_.password) {
        return service_.getAuthorizationBasicAuth();
      } else {
        return null;
      }
    }
    return null;
  };

  this.getServerURL = function() {
    return config_.serverURL;
  };

  this.getTrackURL = function() {
    return config_.protocol.value + '://' + config_.serverURL + '/api/v1/track/';
  };

  this.getFormURL = function() {
    return config_.protocol.value + '://' + config_.serverURL + '/api/v1/form/';
  };

  this.getReportURL = function() {
    return config_.protocol.value + '://' + config_.serverURL + '/api/v1/report/';
  };

  this.getFileServiceURL = function() {
    return config_.protocol.value + '://' + config_.serverURL + '/api/v1/fileservice/';
  };

  this.getAuthenticationURLApiKey = function() {
    return config_.protocol.value + '://' + config_.serverURL + '/mobile/authorize/';
  };

  this.getAuthenticationURLBasicAuth = function() {
    return service_.getFormURL();
  };

})

//TODO: track down issue requiring $ionicPlatform.ready
.factory('dbService', function($cordovaSQLite, $q, $ionicPlatform, utilService) {
  var self = this;

  self.execute = function(db, query, parameters) {
    parameters = parameters || [];
    var q = $q.defer();

    $ionicPlatform.ready(function() {
      $cordovaSQLite.execute(db, query, parameters).then(
        function(result){
          q.resolve(result);
      }, function(error){
          var msg = "Error with DB - " + error.message;
          utilService.notify(msg);
          q.reject(error);
        });
    });
    return q.promise;
  };

  self.getResultAll = function(result) {
    var output = [];
    for (var i = 0; i < result.rows.length; i++){
      output.push(result.rows.item(i));
    }
    return output;
  };

  self.getResultById = function(result) {
    var output = null;
    output = angular.copy(result.rows.item(0));
    return output;
  };

  return self;
})

.service('localDBService', function($q, $cordovaSQLite, dbService, utilService, $ionicPlatform) {
  var service_ = this;
  var localDB_ = null;
  var tables_ = {};

  this.openLocalDB = function(){
    $ionicPlatform.ready(function() {
      localDB_ = $cordovaSQLite.openDB('localDB.sqlite');
    });
  };

  this.createKVTableIfNotExist = function(tableName) {
    var deferred = $q.defer();
    //TODO: add unique constraint for key
    var sql = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (key text not null primary key, value text not null);';
    dbService.execute(localDB_, sql).then(function() {
      tables_[tableName] = true;
      deferred.resolve();
    }, function(){
      deferred.reject();
    });
    return deferred.promise;
  };

  this.createKVTableRemove = function(tableName) {
    var deferred = $q.defer();
    var sql = 'DROP TABLE ' + tableName + ';';
    dbService.execute(localDB_, sql).then(function() {
      delete tables_[tableName];
      deferred.resolve();
    }, function(){
      deferred.reject();
    });
    return deferred.promise;
  };

  this.setKey = function(tableName, key, value, rejectIfKeyExists) {
    var deferred = $q.defer();
    if (!tables_.hasOwnProperty(tableName)) {
      deferred.reject();
      utilService.notify('localDBService, invalid tableName');
    }

    if (typeof key !== 'string') {
      utilService.notify('localDBService, key must be a string');
      deferred.reject();
    }

    if (typeof value !== 'string') {
      value = JSON.stringify(value);
    }

    var rejected = function() {
      utilService.notify('localDBService.set, error. key: ' + key + ', value: ' + value);
      deferred.reject();
    };

    var sql = 'SELECT key, value FROM ' + tableName + ' WHERE key=?;';
    dbService.execute(localDB_, sql, [key]).then(function(res) {
      if (res.rows.length === 0) {
        var sql = 'INSERT INTO ' + tableName + ' (key, value) VALUES (?, ?);';
        dbService.execute(localDB_, sql, [key, value]).then(function(res) {
          deferred.resolve();
        }, rejected);
      } else if (res.rows.length === 1) {
        if (rejectIfKeyExists) {
          deferred.reject('keyExists');
        } else {
          var sqlUpdate = 'UPDATE ' + tableName + ' SET value=? WHERE key=?;';
          dbService.execute(localDB_, sqlUpdate, [value, key]).then(function (res) {
            deferred.resolve();
          }, rejected);
        }
      } else {
        utilService.notify('localDBService.set, Multiple entries for property: ' + key);
        deferred.reject();
      }
    }, rejected);
    return deferred.promise;
  };

  this.getKey = function(tableName, key, parse) {
    var deferred = $q.defer();
    if (!tables_.hasOwnProperty(tableName)) {
      deferred.reject();
      utilService.notify('localDBService, invalid tableName');
    }

    if (typeof key !== 'string') {
      utilService.notify('localDBService, key must be a string');
      deferred.reject();
    }

    var rejected = function() {
      utilService.notify('localDBService.get, error. key: ' + key);
      deferred.reject();
    };

    var sql = 'SELECT key, value FROM ' + tableName + ' WHERE key=?;';
    dbService.execute(localDB_, sql, [key]).then(function(res) {
      if (res.rows.length === 0) {
        deferred.resolve();
      } else if (res.rows.length === 1) {
        var value = res.rows.item(0).value;
        if (parse) {
          value = JSON.parse(value);
        }
        deferred.resolve(value);
      } else {
        utilService.notify('localDBService.get, Multiple entries for property: ' + key);
        deferred.reject();
      }
    }, rejected);
    return deferred.promise;
  };

  this.removeKey = function(tableName, key) {
    var deferred = $q.defer();
    if (!tables_.hasOwnProperty(tableName)) {
      deferred.reject();
      utilService.notify('localDBService, invalid tableName');
    }

    if (typeof key !== 'string') {
      utilService.notify('localDBService.removeKey, key must be a string');
      deferred.reject();
    }

    var rejected = function() {
      utilService.notify('localDBService.removeKey, error. key: ' + key);
      deferred.reject();
    };

    var sql = 'DELETE from ' + tableName + ' WHERE key=?;';
    dbService.execute(localDB_, sql, [key]).then(function(res) {
      console.log(res);
      if (res.rowsAffected === 0) {
        deferred.reject();
      } else if (res.rowsAffected === 1) {
        deferred.resolve();
      } else {
        utilService.notify('localDBService.removeKey, more than 1 row affected for key: ' + key + ', count: ' + res.rowsAffected);
        deferred.reject();
      }
    }, rejected);
    return deferred.promise;
  };

  this.removeValue = function(tableName, value) {
    var key = utilService.getSHA1(value, true);
    return service_.removeKey(tableName, key);
  };

  this.removeAllKeys = function(tableName) {
    var deferred = $q.defer();
    if (!tables_.hasOwnProperty(tableName)) {
      deferred.reject();
      utilService.notify('localDBService, invalid tableName');
    }

    var rejected = function() {
      utilService.notify('localDBService.removeAllKeys, error');
      deferred.reject();
    };

    var sql = 'DELETE from ' + tableName + ';';
    dbService.execute(localDB_, sql, []).then(function(res) {
      console.log(res);
      deferred.resolve();
    }, rejected);
    return deferred.promise;
  };

  // insert value by generating a unique key that doesn't exist in the table.
  this.insertValue = function(tableName, value) {
    var key = utilService.getSHA1(value, true);
    return service_.setKey(tableName, key, value, /* rejectIfKeyExists */ true);
  };

  this.getRowsCount = function(tableName) {
    var deferred = $q.defer();
    if (!tables_.hasOwnProperty(tableName)) {
      deferred.reject();
      utilService.notify('localDBService, invalid tableName');
    }
    var sql = 'SELECT count(*) FROM ' + tableName + ';';
    dbService.execute(localDB_, sql, []).then(function(res) {
      deferred.resolve(res.rows.item(0)['count(*)']);
    }, function() {
      utilService.notify('localDBService.countRows, error. tableName: ' + tableName);
      deferred.reject();
    });
    return deferred.promise;
  };

  this.getAllRows = function(tableName) {
    var deferred = $q.defer();
    if (!tables_.hasOwnProperty(tableName)) {
      deferred.reject();
      utilService.notify('localDBService, invalid tableName');
    }
    var sql = 'SELECT * FROM ' + tableName + ';';
    dbService.execute(localDB_, sql, []).then(function(res) {
      deferred.resolve(res);
    }, function() {
      utilService.notify('localDBService.getAllRows, error. tableName: ' + tableName);
      deferred.reject();
    });
    return deferred.promise;
  };

  this.getAllRowsValues = function(result, parse) {
    var arr = [];
    for (var i = 0; i < result.rows.length; i++){
      if (parse) {
        arr.push(JSON.parse(result.rows.item(i).value));
      } else {
        arr.push(result.rows.item(i).value);
      }
    }
    return arr;
  };

  this.getAllRowsKeys = function(result) {
    var arr = [];
    for (var i = 0; i < result.rows.length; i++){
      arr.push(result.rows.item(i).key);
    }
    return arr;
  };

  this.getAllRowsKVArrays = function(result) {
    var arr = [];
    for (var i = 0; i < result.rows.length; i++){
      var item = result.rows.item(i);
      arr.push([item.key, item.value]);
    }
    return arr;
  };

});
