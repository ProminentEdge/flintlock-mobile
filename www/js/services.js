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

.factory('httpRequestInterceptor', function(networkService) {
   return {
      request: function (config) {
        config.headers.Authorization = networkService.getBasicAuthentication();
        config.timeout = 45000;
        return config;
      }
    };
})

.config(function($interpolateProvider, $httpProvider, $resourceProvider) {
//  $interpolateProvider.startSymbol('{[');
//  $interpolateProvider.endSymbol(']}');

  //$httpProvider.defaults.xsrfCookieName = 'csrftoken';
  //$httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
  $httpProvider.interceptors.push('httpRequestInterceptor');
  $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  //$httpProvider.defaults.headers.common['X-Auth-Token'] = undefined;

  $resourceProvider.defaults.stripTrailingSlashes = false;
})

/*.provider('configService', function() {
  var service_ = null;
  this.configuration = {};
  this.$get = function($window, $http, $location, $translate) {
    service_ = this;
    this.username = 'admin';
    this.password = 'admin';
    //this.csrfToken = $cookies.csrftoken;
    //$translate.use(this.currentLanguage);
    return this;
  };

  this.isAuthenticated = function() {
    return service_.authStatus == 200;
  };
})*/

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

.service('uploadService', function($http, networkService, $q, geolocationService, $cordovaFileTransfer) {
  var service_ = this;

  // upload media in the provided array
  this.uploadMedia = function(filePath) {
    var options = new FileUploadOptions();
    options.fileKey = 'file';
    options.fileName = 'filenameWithExtension.jpg';
    options.headers = {
      'Content-Type': undefined,
      'Authorization': networkService.getAuthenticationHeader().headers.Authorization
    };
    return $cordovaFileTransfer.upload(networkService.getFileServiceURL(), filePath, options);
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

  this.uploadReport = function(report, formUri) {
    var deferred = $q.defer();

    geolocationService.getCurrentPosition().then(function(position) {
      var payload = {
        "data": report,
        "geom": geolocationService.positionToWKT(position),
        "form": formUri
      };

      $http.post(networkService.getReportURL(), JSON.stringify(payload), {
        transformRequest: angular.identity,
        headers: {
          'Authorization': networkService.getAuthenticationHeader().headers.Authorization
        }
      }).success(function() {
        deferred.resolve();
      }).error(function(e) {
        deferred.reject(e);
      });
    });

    return deferred.promise;
  };

  this.uploadPhotoToUrl = function(photo, uploadUrl, callSuccess, callFailure) {

    var photoBlob = dataURLtoBlob(photo);
    var formData = new FormData();
    formData.append("file", photoBlob, 'filename.jpg');

    $http.post(uploadUrl, formData, {
      transformRequest: angular.identity,
      headers: {
        'Content-Type': undefined,
        'Authorization': networkService.getAuthenticationHeader().headers.Authorization
      }
    }).success(function(data) {
      callSuccess(data);
    }).error(function(err) {
      // can be moved to callFailure(err)
      if (err) {
        // if err is null, server not found?
        alert('Photo not uploaded! Error: ' + err.error_message);
      }
      callFailure(err);
    });
  };

  this.uploadPersonToUrl = function(person, uploadUrl, callSuccess, callFailure) {

    var JSONPerson = '{';
    var hasItem = false;

    // TODO: Take all fields and put into service (for each list like this)
    var uploadFields = ['given_name', 'family_name', 'fathers_given_name', 'mothers_given_name', 'age',
      'date_of_birth', 'street_and_number', 'city', 'neighborhood', 'notes', 'description', 'phone_number',
      'barcode', 'gender', 'injury', 'nationality', 'shelter_id', 'pic_filename', 'province_or_state',
      'status'];

    for (var i = 0; i < uploadFields.length; i++) {
      if (i > 0 && i < uploadFields.length) {
        // Add ,
        if (hasItem)
          JSONPerson += ', ';
      }

      JSONPerson += '"' + uploadFields[i] + '":"' + person[uploadFields[i]] + '"';
      hasItem = true;
    }

    JSONPerson += '}';

    $http.post(uploadUrl, JSONPerson, {
      transformRequest: angular.identity,
      headers: {
        'Authorization': 'Basic ' + btoa('admin:admin')
      }
    }).success(function() {
      callSuccess();
    }).error(function(err) {
      // can be moved to callFailure(err)
      alert('Person not uploaded! Error: ' + err.error_message);
      callFailure();
    });
  };
})

.service('utilService', function($cordovaFile, $q) {
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


.service('trackerService', function($http, $q, networkService, geolocationService) {
  this.post = function (position) {
    var deferred = $q.defer();

    var payload = {
      "entity_type": 1,
      "force_type": 1,
      "geom": geolocationService.positionToWKT(position),
      "user": "mobile"
    };

    $http.post(networkService.getTrackURL(), payload, networkService.getAuthenticationHeader()).success(function(data) {
      console.log('----[ trackerService.success: ', data);
      deferred.resolve();
    }).error(function(error) {
      console.log('----[ trackerService.error: ', error);
      deferred.reject(error);
    });

    return deferred.promise;
  };
})

.service('loginService', function($http, $q, networkService) {
  this.login = function (username, password) {
    var deferred = $q.defer();
    networkService.setAuthentication(username, password);
    $http.get(networkService.getAuthenticationURL(), networkService.getAuthenticationHeader()).then(
      function(xhr) {
        if (xhr.status === 200) {
          deferred.resolve();
        } else {
          deferred.reject(xhr);
          alert(xhr.status);
        }
      }, function(error) {
        if (error) {
          if (error.status === 401) {
            deferred.reject(xhr);
            $cordovaToast.showShortBottom(($filter('translate')('error_wrong_credentials')));
          } else {
            alert($filter('translate')('error_connecting_server') + error.status + ": " + error.description);
          }
        }
      });
    return deferred.promise;
  };
})

.service('formService', function($http, networkService, $resource, $q) {
  var service = this;
  var forms = [];
  var current_form = {};
  current_form.str = 'None';
  current_form.link = 'None';

  this.getAll = function() {
    var form = $resource(networkService.getFormURL() + ':id', {}, {
      query: {
        method: 'GET',
        isArray: true,
        transformResponse: $http.defaults.transformResponse.concat([
          function (data, headersGetter) {
            forms = data.objects;
            return data.objects;
          }
        ])
      }
    });

    return form.query().$promise;
  };

  this.getById = function(id) {
    for(var i = 0; i < forms.length; i++) {
      if (forms[i].id == id)
        return forms[i];
    }
  };

  this.getCurrentForm = function() {
    return current_form;
  };

  this.setCurrentForm = function(form){
    if (form !== 'None') {
      current_form.str = form.name;
      current_form.link = '#/vida/form-detail/' + form.id;
    } else {
      current_form.str = 'None';
      current_form.link = 'None';
    }
  };
})

.service('shelterService', function($http, networkService, $resource, $q) {
  var service = this;
  var shelters = [];
  var current_shelter = {};
  current_shelter.str = 'None';
  current_shelter.link = 'None';

  this.getAll = function() {
    var shelter = $resource(networkService.getShelterURL() + ':id', {}, {
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

.service('peopleService', function($http, networkService, uploadService, $cordovaFile) {
    var peopleInShelter = [];
    var personByID = {};
    var testPhoto = {};
    var storedSearchQuery = "";

    this.getPerson = function(URL, query, success, error) {
      $http.get(URL + '&limit=100', networkService.getAuthenticationHeader()).then(function(xhr) {
        if (xhr.status === 200) {
          if (xhr.data !== null) {
            peopleInShelter = [];    // Reset list, is safe

            if (query !== '') { // Temporary fix (search with '' returns all objects (since all contain ''))
              for (var i = 0; i < xhr.data.objects.length; i++) {
                var personOnServer = xhr.data.objects[i];
                var newPerson = {};

                newPerson.given_name = personOnServer.given_name;
                newPerson.status = 'On Server';
                newPerson.id = personOnServer.id;
                newPerson.score = undefined;

                peopleInShelter.push(xhr.data.objects[i]);
              }
            }

            success();
          } else {
            error(undefined);
          }
        } else {
          error(xhr.status);
        }
      }, function(e) {
        error(e.statusText);
      });
    };

    this.searchPersonByID = function(id, success, error) {
      var searchURL = networkService.getSearchURL();
      searchURL += id;

      $http.get(searchURL, networkService.getAuthenticationHeader()).then(function(xhr) {
        if (xhr.status === 200) {
          if (xhr.data !== null) {
            if (xhr.data.objects.length > 0) {
              if (xhr.data.objects.length > 1) {
                // Multiple objects returned, search for ID specifically
                for (var i = 0; i < xhr.data.objects.length; i++){
                  if (parseInt(id) === xhr.data.objects[i].id){
                    personByID = xhr.data.objects[i];
                    break;
                  }
                }
              } else
                personByID = xhr.data.objects[0]; // Only 1 object returned

              success();
            } else {
              error(); // No objects returned
            }
          } else {
            error();
          }
        } else {
          error();
        }
      }, function(e) {
        if (e) {
          if (e.status === 401) {
            alert("Something went wrong with credentials.."); // Should never get in here
          } else {
            alert("A problem occurred when connecting to the server. \nStatus: " + e.status + ": " + e.description);
          }
        }
        error();
      });

      personByID = undefined; // Set by default
    };

    this.getRetrievedPersonByID = function (){
      return personByID;
    };

    this.setStoredSearchQuery = function (query) {
      storedSearchQuery = query;
    };

    this.getStoredSearchQuery = function (){
      return storedSearchQuery;
    };

    this.createSearchResult = function(peopleArr, scoreArr){
      peopleInShelter = [];    // Reset list, is safe

      for (var i = 0; i < peopleArr.length; i++){
        var newPerson = peopleArr[i];
        newPerson.score = scoreArr[i][1].toFixed(5);
        peopleInShelter.push(peopleArr[i]);
      }
    };

    this.updateAllPeople = function(URL, success) {
      $http.get(URL + "?limit=100", networkService.getAuthenticationHeader()).then(function(xhr) {
        if (xhr.status === 200) {
          if (xhr.data !== null) {
            peopleInShelter = [];

            for (var i = 0; i < xhr.data.objects.length; i++) {
              var personOnServer = xhr.data.objects[i];

              // Check for duplicates (only names - then ID so far)
              var duplicate = false;
              for (var j = 0; j < peopleInShelter.length; j++) {
                if (peopleInShelter[j].given_name === personOnServer.given_name){
                  if (peopleInShelter[j].id === personOnServer.id){
                    duplicate = true;
                    break;
                  }
                }
              }

              if (!duplicate) {
                personOnServer.status = "On Server";  //TEMPORARY
                personOnServer.photo = {};

                peopleInShelter.push(personOnServer);
              }
            }

            success();
          }
        }
      });
    };

    this.editPerson_saveChanges = function(newPerson, success, error){
      var putJSON = '{';
      var hasItem = false;

      var changeList = ['given_name', 'family_name', 'fathers_given_name', 'mothers_given_name', 'age',
      'date_of_birth', 'street_and_number', 'city', 'neighborhood', 'description', 'phone_number', 'barcode',
      'gender', 'injury', 'nationality', 'shelter_id'];

      for (var i = 0; i < changeList.length; i++) {
        if (newPerson[changeList[i]] !== undefined) {
          // Add ,
          if (i !== 0) {
            if (hasItem)
              putJSON += ', ';
          }

          putJSON += '"' + changeList[i] + '":"' + newPerson[changeList[i]] + '"';
          hasItem = true;
        }
      }

      // Separate photo check (has different method)
      if (newPerson.photo !== undefined) {
        // Photo has changed, upload it
        uploadService.uploadPhotoToUrl(newPerson.photo, networkService.getFileServiceURL(), function(data) {
          // Successful
          if (hasItem)
            putJSON += ', ';

          putJSON += ' "pic_filename":"' + data.name + '"';
          hasItem = true;

          finishHttpPut(hasItem, newPerson.id, putJSON, success, error);
        }, function() {
          // Error
          finishHttpPut(hasItem, newPerson.id, putJSON, success, error);
        });
      } else {
        finishHttpPut(hasItem, newPerson.id, putJSON, success, error);
      }
    };

    var finishHttpPut = function(hasItem, id, putJSON, success, error) {
      // Put into it's own function to not have gross copy+paste everywhere
      putJSON += '}';

      if (hasItem === true) {
        $http.put(networkService.getPeopleURL() + id + '/', putJSON, networkService.getAuthenticationHeader()).then(function (xhr) {
          if (xhr.status === 204) {
            success();
          } else {
            error();
          }
        });
      } else {
        success();
      }
    };

    this.printToConsole = function() {
      for (var i = 0; i < peopleInShelter.length; i++) {
        console.log(peopleInShelter[i].given_name);
      }
    };

    this.getPeopleInShelter = function() {
      return peopleInShelter;
    };

    this.getPhoto = function() {
      return testPhoto;
    };

    this.getPlaceholderImage = function() {
      return cordova.file.applicationDirectory + 'www/img/profile-photo-placeholder.jpg';
    };

    /*this.downloadPhotos = function() {
      var array = peopleInShelter;
      for (var i = 0; i < array.length; i++) {
        if (array[i].pic_filename && array[i].pic_filename !== "undefined") {
          var thisURL = networkService.getFileServiceURL() + array[i].pic_filename + 'download/';
          $http.get(thisURL).then(function (xhr) {
            if (xhr.status === 200) {
              if (xhr.data.status !== "file not found") {
                testPhoto = xhr.data;
                if (false) {
                  var reader = new window.FileReader();
                  reader.readAsDataURL(new Blob([xhr.data]));
                  reader.onloadend = function () {
                    var start = reader.result.split(',');
                    testPhoto = "data:image/jpeg;base64," + start[1];
                  };
                }
              }
            }
          }, function (error) {
            // Error
          });
        }
      }
    };*/
  })

.service('optionService', function() {
    var gender_options = [
      {
        "name": 'person_not_specified',
        "value": "Not Specified"
      },
      {
        "name": 'person_gender_male',
        "value": "Male"
      },
      {
        "name": 'person_gender_female',
        "value": "Female"
      },
      {
        "name": 'person_gender_other',
        "value": "Other"
      }
    ];

    var injury_options = [
      {
        "name": 'person_injury_not_injured',
        "value": "Not Injured"
      },
      {
        "name": 'person_injury_moderate',
        "value": "Moderate"
      },
      {
        "name": 'person_injury_severe',
        "value": "Severe"
      }
    ];

    var language_options = [
      {
        "name": 'settings_language_english',
        "value": "English"
      },
      {
        "name": 'settings_language_spanish',
        "value": "Spanish"
      }
    ];

    var nationality_options = [
      {
        "name": 'person_not_specified',
        "value": "Not Specified"
      },
      {
        "name": 'person_nationality_english',
        "value": "English"
      },
      {
        "name": 'person_nationality_african',
        "value": "African"
      },
      {
        "name": 'person_nationality_asian',
        "value": "Asian"
      }
    ];

    var default_configurations = {};
    default_configurations.configuration = {};
    default_configurations.configuration.serverURL = "192.168.33.15";
    default_configurations.configuration.username = "admin";
    default_configurations.configuration.password = "admin";
    default_configurations.configuration.protocol = "http";
    default_configurations.configuration.language = "English";
    default_configurations.configuration.workOffline = "false";

    this.getGenderOptions = function() {
      return gender_options;
    };

    this.getInjuryOptions = function() {
      return injury_options;
    };

    this.getLanguageOptions = function() {
      return language_options;
    };

    this.getNationalityOptions = function() {
      return nationality_options;
    };

    this.getDefaultConfigurations = function() {
      return default_configurations;
    };

    this.getDefaultConfigurationsJSON = function() {
      var configs = ['serverURL', 'username', 'password', 'protocol',' language', 'workOffline'];
      var JSONObject = "'{\"configuration\":{";
      for (var i = 0; i < configs.length; i++){
        JSONObject += '\"' + configs[i] + '\":\"' + default_configurations.configuration[configs[i]] + '\"';
        if (i !== configs.length - 1)
          JSONObject += ", ";
      }
      JSONObject += "}}'";
      return JSONObject;
    };
  })

  // TODO: Rename to configService
.service('networkService', function(optionService, $translate) {

    var self = this;
    this.configuration = {};

    var default_config = optionService.getDefaultConfigurations();
    this.configuration.username = default_config.configuration.username;
    this.configuration.password = default_config.configuration.password;
    this.configuration.serverURL = default_config.configuration.serverURL;
    this.configuration.protocol = default_config.configuration.protocol;
    this.configuration.language = default_config.configuration.language;
    this.configuration.workOffline = (default_config.configuration.workOffline === 'true');

    var URL = this.configuration.protocol + '://' + this.configuration.serverURL + '/api/v1';
    this.configuration.api = {};
    this.configuration.api.trackURL = URL + '/track/';
    this.configuration.api.formURL = URL + '/form/';
    this.configuration.api.reportURL = URL + '/report/';
    this.configuration.api.personURL = URL + '/person/';
    this.configuration.api.searchURL = URL + '/person/?custom_query=';
    this.configuration.api.fileServiceURL = URL + '/fileservice/';
    this.configuration.api.shelterURL = URL + '/shelter/';
    this.configuration.api.faceSearchURL = URL + '/facesearchservice/';

    this.SetConfigurationFromDB = function(DBSettings) {
      // Set DB settings
      self.configuration.username = DBSettings.configuration.username;
      self.configuration.password = DBSettings.configuration.password;
      self.configuration.serverURL = DBSettings.configuration.serverURL;
      self.configuration.protocol = DBSettings.configuration.protocol;
      self.configuration.language = DBSettings.configuration.language;
      if (self.configuration.language === "English")
        $translate.use('en');
      else if (self.configuration.language === "Spanish")
        $translate.use('es');
      else
        $translate.use('en');
      self.configuration.workOffline = (DBSettings.configuration.workOffline === 'true');

      self.setServerAddress(DBSettings.configuration.serverURL);
    };

    this.getServerAddress = function() {
      return this.configuration.serverURL;
    };

    this.setServerAddress = function(Addr) {
      this.configuration.serverURL = Addr;

      var URL = this.configuration.protocol + '://' + Addr + '/api/v1';
      // Need to reset variables
      //TODO: this has to change. we are computing the same exact urls two places. Do not store, concant on get instead
      this.configuration.api.trackURL = URL + '/track/';
      this.configuration.api.formURL = URL + '/form/';
      this.configuration.api.reportURL = URL + '/report/';
      this.configuration.api.personURL = URL + '/person/';
      this.configuration.api.searchURL = URL + '/person/?custom_query=';
      this.configuration.api.fileServiceURL = URL + '/fileservice/';
      this.configuration.api.shelterURL = URL + '/shelter/';
      this.configuration.api.faceSearchURL = URL + '/facesearchservice/';
    };

    this.getBasicAuthentication = function() {
      var authentication = btoa(this.configuration.username + ':' + this.configuration.password);
      return 'Basic ' + authentication;
    };

    this.getAuthenticationHeader = function() {
      var authentication = btoa(this.configuration.username + ':' + this.configuration.password);
      var authen = {};
      authen.headers = {};
      if (authentication !== null) {
        authen.headers.Authorization = 'Basic ' + authentication;
      } else {
        authen.headers.Authorization = '';
      }

      return authen;
    };

    this.setAuthentication = function(username, password){
      this.configuration.username = username;
      this.configuration.password = password;
    };

    this.setLanguage = function(current_language){
      this.configuration.language = current_language;
    };

    this.getConfiguration = function(){
      return this.configuration;
    };

    // todo: get rid of this usage
    this.getAuthentication = function(){
      return this.configuration;
    };

    this.getTrackURL = function() {
      return this.configuration.api.trackURL;
    };

    this.getFormURL = function() {
      return this.configuration.api.formURL;
    };

    this.getReportURL = function() {
      return this.configuration.api.reportURL;
    };

    this.getPeopleURL = function() {
      return this.configuration.api.personURL;
    };

    this.getAuthenticationURL = function() {
      return this.configuration.api.personURL;
    };

    this.getSearchURL = function() {
      return this.configuration.api.searchURL;
    };

    this.getFileServiceURL = function() {
      return this.configuration.api.fileServiceURL;
    };

    this.getShelterURL = function() {
      return this.configuration.api.shelterURL;
    };

    this.getFaceSearchServiceURL = function() {
      return this.configuration.api.faceSearchURL;
    };
  })

.factory('DBHelper', function($cordovaSQLite, $q, $ionicPlatform) {
    var self = this;

    self.query = function(query, parameters) {
      parameters = parameters || [];
      var q = $q.defer();

      $ionicPlatform.ready(function() {
        $cordovaSQLite.execute(db, query, parameters).then(
          function(result){
            q.resolve(result);
        }, function(error){
            console.log("Error with DB - " + error.message);
            q.reject(error);
          });
      });

      return q.promise;
    };

    self.getAll = function(result) {
      var output = [];

      for (var i = 0; i < result.rows.length; i++){
        output.push(result.rows.item(i));
      }

      return output;
    };

    self.getById = function(result) {
      var output = null;
      output = angular.copy(result.rows.item(0));
      return output;
    };

    return self;
  })

.factory('VIDA_localDB', function($cordovaSQLite, DBHelper, networkService){
    var self = this;

    self.queryDB_select = function(tableName, columnName, afterQuery) {
      return DBHelper.query("SELECT " + columnName + " FROM " + tableName)
        .then(function(result){
          afterQuery(DBHelper.getAll(result));
        });
    };

    self.queryDB_update = function(tableName, JSONObject) {
      var query = "UPDATE " + tableName + " SET settings=" + JSONObject;
      console.log(query);
      DBHelper.query(query)
        .then(function (result) {
          console.log(result);
        });
    };

    self.queryDB_update_settings = function(){
      var fields = ['serverURL', 'username', 'password', 'protocol', 'language', 'workOffline'];
      var currentConfiguration = networkService.getConfiguration();
      var JSONObject = "'{\"configuration\":{";
      for (var i = 0; i < fields.length; i++){
        JSONObject += '\"' + fields[i] + '\":\"' + currentConfiguration[fields[i]] + '\"';
        if (i !== fields.length - 1)
          JSONObject += ", ";
      }
      JSONObject += "}}'";
      var query = "UPDATE configuration SET settings=" + JSONObject;
      console.log(query);
      DBHelper.query(query).then(function(result){
        console.log(result);
      });
    };

    self.queryDB_insert = function(tableName, JSONObject) {
      var query = "INSERT INTO " + tableName + " VALUES (" + JSONObject + ")";
      console.log(query);
      DBHelper.query(query)
        .then(function (result) {
          console.log(result);
        });
    };

    return self;
  });
