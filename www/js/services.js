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


.factory('httpRequestInterceptor', function(configService) {
   return {
      request: function (config) {
        // if request doesn't have authorization header already, add basic auth
        if (typeof config.headers.Authorization === 'undefined') {
          config.headers.Authorization = configService.getBasicAuthentication();
        }

        // set max timeout since if creds are not valid for endpoint with basic auth, it will go for 90 secs or whatever
        // the large default is.
        if (typeof config.timeout === 'undefined') {
          config.timeout = 10000;
        }

        return config;
      }
    };
})

.config(function($interpolateProvider, $httpProvider, $resourceProvider) {
  //$interpolateProvider.startSymbol('{[');
  //$interpolateProvider.endSymbol(']}');
  //$httpProvider.defaults.xsrfCookieName = 'csrftoken';
  //$httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
  //$httpProvider.interceptors.push('httpRequestInterceptor');
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

.service('uploadService', function($http, configService, $q, geolocationService, $cordovaFileTransfer) {
  var service_ = this;

  // upload media in the provided array
  this.uploadMedia = function(filePath) {
    var options = new FileUploadOptions();
    options.fileKey = 'file';
    options.fileName = 'filenameWithExtension.jpg';
    options.headers = {
      'Content-Type': undefined,
      'Authorization': configService.getAuthenticationHeader().headers.Authorization
    };
    return $cordovaFileTransfer.upload(configService.getFileServiceURL(), filePath, options);
  };

  //TODO: when an iten in the array failes, still need to return filehashes so that feature can be uploadeded with missing files.
  this.uploadMediaArray = function(filePaths) {
    if (!filePaths) {
      filePaths = [];
    }

    var deferred = $q.defer();
    var filePathsFailed = [];
    var filePathsSucceededFileNames = [];

    var onCompleted = function(succeeded, newFilename) {
      var completedFilePath = filePaths.pop();
      if (succeeded) {
        filePathsSucceededFileNames.push(newFilename);
      } else {
        filePathsFailed.push(completedFilePath);
      }
      if (filePaths.length === 0) {
        deferred.resolve(filePathsFailed, filePathsSucceededFileNames);
      } else {
        uploadAnother();
      }
    };

    var uploadAnother = function() {
      if (filePaths.length > 0) {
        service_.uploadMedia(filePaths.slice(-1).pop()).then(function (data) {
          onCompleted(true, data.name);
        }, function (e) {
          onCompleted(false)
        });
      } else {
        // assume success, no failed files and no new filenames
        deferred.resolve([], []);
      }
    };

    uploadAnother();
    return deferred.promise;
  };

  this.uploadReport = function(report) {
    var deferred = $q.defer();
    delete report.timestamp_local; // is was a temp key not meant for server
    $http.post(configService.getReportURL(), JSON.stringify(report), {
      transformRequest: angular.identity,
      headers: {
        'Authorization': configService.getBasicAuthentication()
      }
    }).success(function() {
      deferred.resolve();
    }).error(function(e) {
      deferred.reject(e);
    });
    return deferred.promise;
  };
})

.service('utilService', function($cordovaFile, $q, $cordovaToast) {
  var service_ = this;

  // given a full file path, get the binary data in the file
  this.getFileAsBinaryString = function(filePath, encodeAsBase64) {
    var deferred = $q.defer();
    var lastSlashIndex = filePath.lastIndexOf("/");
    var fileDir = filePath.substring(0, lastSlashIndex);
    var filename = filePath.substring(lastSlashIndex + 1);
    $cordovaFile.readAsBinaryString(fileDir, filename).then(function(data) {
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

  //Note: $q.all does this but need the sync version
  this.foreachWaitForCompletionAsync = function(array, operation) {
    var deferred = $q.defer();
    if (array.length === 0) {
      deferred.resolve();
    }
    var completed = 0;
    for (var key in array) {
      operation(array[key]).then(function(){
        completed++;
        if (completed === array.length) {
          deferred.resolve();
        }
      }, function(){
        alert('operation failed for item in array');
        deferred.reject();
      })
    }
    return deferred.promise;
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
        deferred.resolve(itemsFailed, itemsSucceededResponse);
      } else {
        uploadAnother();
      }
    };

    var uploadAnother = function () {
      if (array.length > 0) {
        operation(array.slice(-1).pop()).then(function (data) {
          onCompleted(true, data);
        }, function () {
          utilService.notify("a media failed to upload, in uploadAnother");
          onCompleted(false)
        });
      } else {
        // assume success, no failed files and no new filenames
        deferred.resolve([], []);
      }
    };

    uploadAnother();
    return deferred.promise;
  };
})


.factory('geolocationService', function ($q, $timeout) {
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
        }, function () {
          deferred.reject();
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


.service('trackerService', function($http, $q, configService, geolocationService) {
  this.post = function (position, mayday) {
    var deferred = $q.defer();

    var payload = {
      "mayday": mayday,
      "geom": geolocationService.positionToWKT(position),
      "user": configService.getConfig().username
    };

    $http.post(configService.getTrackURL(), payload, configService.getAuthenticationHeader()).success(function(data) {
      console.log('----[ trackerService.success: ', data);
      deferred.resolve();
    }).error(function(error) {
      console.log('----[ trackerService.error: ', error);
      deferred.reject(error);
    });

    return deferred.promise;
  };
})

.service('loginService', function($http, $q, configService, $cordovaToast, $filter) {
  this.login = function (username, password) {
    var deferred = $q.defer();
    $http.get(configService.getAuthenticationURL(),
      {
        "headers": {
          "Content-Type": '',
          "Authorization": configService.getBasicAuthentication()
        },
        "timeout": 3000
      }).then(
      function(result) {
        console.log('------ login success: ', result);
        if (result.status === 200) {
          deferred.resolve();
        } else {
          deferred.reject(result);
        }
      }, function(error) {
        console.log('------ login error: ', error);
        if (error) {
          // Note: 401 will NOT occure when endpoint is basic auth and invalid creds are used. That's when basic auth
          //       dialog is supposed to come up which does not on mobile browser so the request stays active until
          //       timeout is reached. this is why we are using a short timeout for this request and catching status 0
          //       assuming that it is the bad credentials.
          //       When the server ip is invalid, timeout will occur as well. not possible to know when
          //TODO: make server return custom header instead of the basicauth prompt
          if (error.status === 401 || error.status === 0) {
            $cordovaToast.showShortBottom(($filter('translate')('error_invalid_credentials')));
          } else if (error.status === 404) {
            $cordovaToast.showShortBottom(($filter('translate')('error_server_not_found')));
          } else {
            $cordovaToast.showShortBottom($filter('translate')('error_connecting_server') + ', '
              + error.status + ": " + error.description);
          }
        } else {
          $cordovaToast.showShortBottom($filter('translate')('error_connecting_server'));
        }
        deferred.reject();
      });
    return deferred.promise;
  };

  this.loginAjax = function (username, password) {
    var deferred = $q.defer();

    $.ajax({
      type: 'GET',
      url: configService.getAuthenticationURL(),

      // ****************        syncronous call!        *****************
      // with basic auth, when the credentials are wrong, the app doesn't get a 401 as the 'browser'/webview is supposed
      // to popup the basic auth dialog for user to retry which doesn't work on mobile. This means the request attempt
      // stays active until the timeout duration is hit at which point you still dont see the 401 and just a timeout.
      // when call is NOT async, you get the 401. The app will 'hang' for a bit of course...
      async: false,
      timeout: 3000,

      "headers": {
        "Content-Type": '',
        "Authorization": configService.getBasicAuthentication()
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
})

.service('formService', function($http, $q, configService, $resource, localDBService) {
  var service_ = this;
  var forms_ = [];
  var currentForm_ = null;

  this.pullFroms = function() {
    var formResource = $resource(configService.getFormURL() + ':id', {}, {
      query: {
        method: 'GET',
        headers: {
          "Authorization": configService.getBasicAuthentication()
        },
        timeout: 10000,
        isArray: true,
        transformResponse: $http.defaults.transformResponse.concat([
          function (data, headersGetter) {
            service_.setForms(data.objects, true);
            return data.objects;
          }
        ])
      }
    });

    return formResource.query().$promise;
  };

  this.getById = function(id) {
    for(var i = 0; i < forms_.length; i++) {
      if (forms_[i].id == id)
        return forms_[i];
    }
  };

  this.getCurrentForm = function() {
    return currentForm_;
  };

  this.setCurrentForm = function(id) {
    currentForm_ = forms_[id];
  };

  this.getForms = function() {
    return forms_;
  };

  this.setForms = function(forms) {
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      if (typeof forms[i].schema === 'string') {
        forms[i].schema = JSON.parse(forms[i].schema);
      }
    }
    forms_ = forms;
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
  }

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

  // when the application is first installed & launched, these settings will be used.
  var initialConfig_ = {
    serverURL: '192.168.33.15',
    username: 'admin',
    password: 'admin',
    protocol: {
      'name': 'Http',
      'value': 'http'
    },
    language: {
      'name': 'settings_language_english',
      'value': 'English'
    },
    syncLastSuccess: null,
    trackingLastSuccess: null
  };

  // the current config. Often has been modified by user and loaded from db
  var config_ = null;

  this.loadConfig = function() {
    var deferred = $q.defer();
    localDBService.getKey('properties', 'config', true).then(function(configFromDB){
      config_ = $.extend({}, initialConfig_);
      config_ = $.extend( config_, configFromDB );
      console.log('loaded config: ', config_);
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

  // watch and auto-save?
  this.getConfig = function() {
    return config_;
  };

  this.getBasicAuthentication = function() {
    return 'Basic ' + btoa(config_.username + ':' + config_.password);
  };

  this.getAuthenticationHeader = function() {
    return {
      "headers": {
        "Authorization": service_.getBasicAuthentication()
      }
    };
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

  this.getAuthenticationURL = function() {
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
          var sql = 'UPDATE ' + tableName + ' SET value=? WHERE key=?;';
          dbService.execute(localDB_, sql, [value, key]).then(function (res) {
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

  // insert value with by generating a unique key that doesn't exist in the table.
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

});
