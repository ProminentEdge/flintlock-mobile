angular.module('vida.controllers', ['ngCordova.plugins.camera', 'pascalprecht.translate'])


.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $timeout, shelterService, $translate, configService) {
  console.log('---------------------------------- AppCtrl');
  $translate.instant("title_search");
  console.log('---------------------------------- translate: ', $translate.instant("title_search"));



    $rootScope.$on('$stateChangeStart',function(event, toState, toParams, fromState, fromParams){
    console.log('$stateChangeStart to '+toState.to+'- fired when the transition begins. toState,toParams : \n',toState, toParams);
    });

  $rootScope.$on('$stateChangeError',function(event, toState, toParams, fromState, fromParams){
    console.log('$stateChangeError - fired when an error occurs during transition.');
    console.log(arguments);
  });

  $rootScope.$on('$stateChangeSuccess',function(event, toState, toParams, fromState, fromParams){
    console.log('$stateChangeSuccess to '+toState.name+'- fired once the state transition is complete.');
  });

  $rootScope.$on('$viewContentLoaded',function(event){
    console.log('$viewContentLoaded - fired after dom rendered',event);
  });

  $rootScope.$on('$stateNotFound',function(event, unfoundState, fromState, fromParams){
    console.log('$stateNotFound '+unfoundState.to+'  - fired when a state cannot be found by its name.');
    console.log(unfoundState, fromState, fromParams);
  });

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('views/modal-sample.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.cancelModal = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.modal_sample = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.okayModal = function() {
    console.log('Doing login', $scope.loginData);
  };

  $rootScope.center = {
    lat: 0,
    lng: 0,
    zoom: 0
  };

  // initialize once. we will only work with this created object from now on
  $rootScope.markers = {};

})

.controller('PersonDetailEditCtrl', function($scope, $state, $rootScope, $stateParams, $http, shelter_array, $cordovaToast,
                                             $filter, $cordovaActionSheet, $cordovaCamera, configService, shelterService,
                                             $cordovaProgress) {
  console.log('---------------------------------- PersonDetailEditCtrl');

  $scope.setupSaveCancelButtons = function() {
    // Setup tab-specific buttons
    var tabs = document.getElementsByClassName("tab-item");
    for (var i=0; i < tabs.length; i++) {
      tabs[i].setAttribute('style', 'display: none;');
    }

    var editDeleteButtons = document.getElementsByClassName("button-person-edit");
    var saveCancelButtons = document.getElementsByClassName("button-person-post-edit");
    for (i=0; i < saveCancelButtons.length; i++) {
      saveCancelButtons[i].setAttribute('style', 'display: block;');  // Enables buttons
    }

    $scope.$on("$destroy", function(){
      for (var i=0; i < tabs.length; i++) {
        tabs[i].setAttribute('style', 'display: none;');
      }

      for (i=0; i < saveCancelButtons.length; i++) {
        saveCancelButtons[i].setAttribute('style', 'display: none;');   // Removes buttons
      }

      for (i=0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].setAttribute('style', 'display: block;');   // Enables buttons
      }
    });
  };

  $rootScope.buttonPersonCancel = function() {
    console.log('PersonDetailCtrl - buttonPersonCancel()');

    if (confirm($filter('translate')('dialog_confirm_cancel'))) {
      window.history.back();
    }
  };

  // Startup
  $scope.setupSaveCancelButtons();
  $cordovaProgress.hide();
})

.controller('ShelterSearchCtrl', function($scope, $location, $http){
  console.log('---------------------------------- ShelterSearchCtrl');
})

.controller('SettingsCtrl', function($scope, $location, configService, $translate, $cordovaOauth, $ionicPopup,
                                     localDBService, $rootScope, $cordovaToast){
  console.log('---------------------------------- SettingsCtrl');

  $scope.configService = configService;
  $scope.languageOptions = [
    {
      "name": 'settings_language_english',
      "value": "English"
    },
    {
      "name": 'settings_language_spanish',
      "value": "Spanish"
    }
  ];

  $scope.protocolOptions = [
    {
      "name": 'Http',
      "value": 'http'
    },
    {
      "name": 'Https (SSL)',
      "value": 'https'
    }
  ];

  $scope.logout = function(url) {
    // Can go directly to '/login'
    $location.path(url);
  };

  $scope.testOauth = function() {
    // Can go directly to '/login'
    console.log('---[ testOauth: ');

    $cordovaOauth.google("870172265350-qpj5qtn1vddqqkqpbsjhseifehb4j9g3.apps.googleusercontent.com", ["email"]).then(function(result) {
      console.log("Response Object -> " + JSON.stringify(result));
    }, function(error) {
      console.log("Error -> " + error);
    });
  };

  $scope.switchLanguage = function() {
    if (configService.getConfig().language.value === "English")
      $translate.use('en');
    else if (configService.getConfig().language.value === "Spanish")
      $translate.use('es');
    else
      $translate.use('en');

    configService.saveConfig();
  };

  $scope.resetDB = function() {
    $ionicPopup.confirm({
      title: 'Reset Database',
      template: 'All pending reports and media will be reset. Continue?'
    }).then(function(res) {
      if (res) {
        localDBService.removeAllKeys('reports').then(function(){
          localDBService.removeAllKeys('media').then(function(){
            localDBService.getRowsCount('reports').then(function(count) {
              $rootScope.pendingReportsCount = count;
              $cordovaToast.showShortBottom('Reports and media were reset');
            });
          });
        });
      }
    });
  };

  $scope.dumpDB = function() {
    localDBService.getAllRows('reports').then(function(res) {
      console.log('reports, keys: ', localDBService.getAllRowsKeys(res));
      console.log('reports, values: ', localDBService.getAllRowsValues(res, true));
    });
    localDBService.getAllRows('media').then(function(res) {
      console.log('media, keys: ', localDBService.getAllRowsKeys(res));
      console.log('media, values: ', localDBService.getAllRowsValues(res));
    });
    localDBService.getAllRows('forms').then(function(res) {
      console.log('forms, keys: ', localDBService.getAllRowsKeys(res));
      console.log('forms, values: ', localDBService.getAllRowsValues(res));
    });
    localDBService.getAllRows('properties').then(function(res) {
      console.log('properties, keys: ', localDBService.getAllRowsKeys(res));
      console.log('properties, values: ', localDBService.getAllRowsValues(res));
    });

    console.log('current config: ', configService.getConfig());
  };

})

.controller('TrackingCtrl', function($scope, $location, configService,
                                     $translate, $interval, geolocationService, trackerService,
                                     $filter, $timeout, $cordovaToast){
  console.log('---------------------------------- TrackingCtrl');
  // Note: due to an angular scoping bug, toggle sate needs to be in another object
  $scope.tracking = { state: false };
  $scope.mayday = { state: false };
  $scope.trackingInterval = null;
  $scope.configService = configService;
  $scope.isLoading = false;

  $scope.$watch('mayday.state', function(newVal, oldVal) {
    if (newVal !== oldVal) {
      if (newVal === true) {
        $scope.tracking.state = true;
      }
    }
  });

  $scope.$watch('tracking.state', function(newVal, oldVal) {
    if (newVal !== oldVal) {
      if (newVal === false) {
        $scope.mayday.state = false;
        $scope.trackingStop();
      } else {
        $scope.trackingStart();
      }
    }
  });

  $scope.trackingStart = function() {
    console.log('----[ trackingStart');
    if ( $scope.trackingInterval !== null ) return;
    $scope.trackingProcess(); // call immediately and schedule another
  };

  $scope.trackingScheduleNext = function() {
    if ($scope.tracking.state) {
      if ($scope.trackingInterval !== null) return;
      $scope.trackingInterval = $timeout($scope.trackingProcess, 10000);
    }
  };

  $scope.trackingStop = function() {
    console.log('----[ trackingStop');
    if ($scope.trackingInterval !== null) {
      $timeout.cancel($scope.trackingInterval);
      $scope.trackingInterval = null;
    }
  };

  $scope.trackingProcess = function() {
    console.log('---[ trackingProcess ');
    $scope.isLoading = true;
    geolocationService.getCurrentPosition().then(function (position) {
      trackerService.post(position, $scope.mayday.state).then(function(){
        $scope.isLoading = false;
        configService.getConfig().trackinglastSuccess = new Date();
        configService.saveConfig();
        $scope.trackingInterval = null;
        $scope.trackingScheduleNext();
      }, function(error) {
        $scope.isLoading = false;
        $cordovaToast.showShortBottom($filter('translate')('error_sending'));
        $scope.trackingInterval = null;
        $scope.trackingScheduleNext();
      });
    }, function (reason) {
      $scope.isLoading = false;
      $cordovaToast.showShortBottom('Cannot obtain current location. ' + reason);
      $scope.trackingInterval = null;
      $scope.trackingScheduleNext();
    });
  };
})

.controller('loginCtrl', function($scope, $location, $http, configService, $filter, $cordovaToast,
                                  loginService, $cordovaProgress){
  console.log('---------------------------------- loginCtrl');
  $scope.configService = configService;

  $scope.login = function(gotoUrl, verify) {
    // Request authorization
    if ((configService.getConfig().username) && (configService.getConfig().password)) {
      configService.saveConfig();
      if (verify) {
        $cordovaProgress.showSimpleWithLabelDetail(true, "Logging in", "Verifying Credentials");

        loginService.login(configService.getConfig().username, configService.getConfig().password).then(function () {
            $location.path(gotoUrl);
            $cordovaProgress.hide();
          },
          function () {
            $cordovaProgress.hide();
          }
        );
      } else {
        $location.path(gotoUrl);
      }
    } else {
      if (!(configService.getConfig().username) && !(configService.getConfig().password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username_password'));
      } else if (!(configService.getConfig().username)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username'));
      } else if (!(configService.getConfig().password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_password'));
      }
    }
  };
})

.controller('ReportCreateCtrl', function($scope, $rootScope, $q, $stateParams, formService, $cordovaToast, $filter,
                                         localDBService, utilService, uploadService, configService){
  console.log("---- ReportCreateCtrl");
  $scope.configService = configService;
  $scope.isLoading = false;
  $scope.formService = formService;

  $scope.sync = function() {
    if (!$scope.isLoading) {
      $scope.isLoading = true;

      var rejected = function() {
        utilService.notify('sync failed.');
      };

      //-- pull forms
      formService.pullFroms().then(function(forms) {
        //--save forms
        formService.saveForms().then(function() {
          //-- push reports
          localDBService.getAllRows('reports').then(function (result) {
            var reports = localDBService.getAllRowsValues(result, true);
            var reportsKeys = localDBService.getAllRowsKeys(result);
            utilService.foreachWaitForCompletionAsync(reports, uploadService.uploadReport).then(function () {
              //TODO: use instead promises = reportsKeys.map(localDBService.removeKey.bind(null, 'reports'))
              //-- remove pushed reports from local db
              var promises = [];
              for (var index in reportsKeys) {
                promises.push(localDBService.removeKey('reports', reportsKeys[index]));
              }
              $q.all(promises).then(function () {
                //-- push media
                localDBService.getAllRows('media').then(function (result) {
                  var filePaths = localDBService.getAllRowsValues(result);
                  var filePathsKeys = localDBService.getAllRowsKeys(result);
                  // upload pics one at a time ("Sync") to be bandwidth conscious
                  utilService.foreachWaitForCompletionSync(filePaths, uploadService.uploadMedia).then(function () {
                    //-- removed pushed media from local db
                    var promises = [];
                    for (var index in filePathsKeys) {
                      promises.push(localDBService.removeKey('media', filePathsKeys[index]));
                    }
                    $q.all(promises).then(function () {
                        //-- update badge for pending reports
                        localDBService.getRowsCount('reports').then(function (count) {
                          $rootScope.pendingReportsCount = count;
                          configService.getConfig().syncLastSuccess = new Date();
                          configService.saveConfig();
                          $scope.isLoading = false;
                          utilService.notify('Sync Completed.');
                        });
                      },
                      function () {
                        utilService.notify('failed to remove pushed media');
                        $scope.isLoading = false;
                      });
                  }, function () {
                    utilService.notify('failed to push media');
                    $scope.isLoading = false;
                  });
                }, function () {
                  utilService.notify('failed to get media from local db');
                  $scope.isLoading = false;
                });
              }, function () {
                utilService.notify("failed to remove pushed reports");
                $scope.isLoading = false;
              });
            }, function () {
              utilService.notify('failed to push reports');
              $scope.isLoading = false;
            });
          }, function () {
            console.log("---- sync, error");
            $cordovaToast.showShortBottom(($filter('translate')('error_server_not_found')));
            $scope.isLoading = false;
          });
        }, function() {
          utilService.notify('failed to remove all existing forms from local db');
        })
      }, function () {
        utilService.notify('failed to pull forms');
        $scope.isLoading = false;
      });
    }
  }
})

.controller('ReportDetailCtrl', function($scope, $rootScope, $stateParams, $cordovaActionSheet, $cordovaCamera, $filter,
                                         $ionicLoading, uploadService, utilService, localDBService, geolocationService,
                                         $cordovaToast, $cordovaProgress, $q, $state, formService){
  console.log("---- ReportDetailCtrl");
  $scope.formService = formService;
  $scope.report = {};
  $scope.mediaPendingUploadMap = {};

  formService.setCurrentForm($stateParams.reportId);

  $scope.addMedia = function(filePath) {
    console.log('----[ addMedia: ', filePath);
    if (($scope.report[$scope.getMediaPropName()] instanceof Array) === false) {
      $scope.report[$scope.getMediaPropName()] = [];
    }

    utilService.getFileAsBinaryString(filePath, false).then( function(result) {
      var filenameSha1 = utilService.getSHA1(result) + '.jpg';
      $scope.mediaPendingUploadMap[filenameSha1] = filePath;
      $scope.report[$scope.getMediaPropName()].push(filenameSha1);
      console.log('----[ filenameSha1: ', filenameSha1);
    }, function(err) {
      console.log('---[ error. failed to get media file binary data: ', err);
    });
  };

  $scope.save = function() {
    console.log('----[ save: ', $scope.report);

    $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Saving report to local DB");
    geolocationService.getCurrentPosition().then(function(position) {
      var payload = {
        "timestamp_local": new Date(),   // help make the object and hense the hash unique
        "data": $scope.report,
        "geom": geolocationService.positionToWKT(position),
        "form": formService.getCurrentForm().resource_uri
      };

      localDBService.insertValue('reports', payload).then(function() {
        localDBService.getRowsCount('reports').then(function(count) {
          $rootScope.pendingReportsCount = count;

          //TODO: implement foreachWaitForCompletionAsync such that it can call setKey and pass all arguments to it
          var promises = [];
          for (var key in $scope.mediaPendingUploadMap) {
            promises.push(localDBService.setKey('media', key, $scope.mediaPendingUploadMap[key], false));
          }
          $q.all(promises).then(function() {
            $scope.mediaPendingUploadMap = {};
            $cordovaProgress.hide();
            utilService.notify("Report saved to local db");
            $state.go('vida.report-create');
          },
          function(){
            utilService.notify("failed to save media to local db: " + key);
            $cordovaProgress.hide();
          });
        }, function() {
          $cordovaProgress.hide();
        });
      });
    });
  };

  $scope.showHint = function(msg) {
    console.log('----[ ', msg);
    $ionicLoading.show({
      template: msg,
      duration: 2000
    });
  };

  $scope.hasMedia = function() {
    return typeof $scope.getMediaPropName() != 'undefined';
  };

  $scope.getMediaPropName = function() {
    if ('photos' in formService.getCurrentForm().schema.properties)
      return 'photos';
    if ('Photos' in formService.getCurrentForm().schema.properties)
      return 'Photos';
  };

  $scope.showCameraModal = function() {
    var prevPicture = false;
    var options = {
      title: $filter('translate')('title_picture_dialog'),
      buttonLabels: [$filter('translate')('modal_picture_take_picture'), $filter('translate')('modal_picture_choose_from_library')],
      addCancelButtonWithLabel: $filter('translate')('modal_cancel'),
      androidEnableCancelButton : true,
      winphoneEnableCancelButton : true
    };

    if ($scope.hasPlaceholderImage) {
      options.buttonLabels = [$filter('translate')('modal_picture_take_picture'),
        $filter('translate')('modal_picture_choose_from_library'),
        $filter('translate')('modal_picture_remove_picture')];
      prevPicture = true;
    }

    $cordovaActionSheet.show(options)
      .then(function(btnIndex) {
        if (prevPicture) {
          if (btnIndex != 3) {
            $scope.takeCameraPhoto_Personal(btnIndex);
          } else {
            //document.getElementById('personal_photo').src = peopleService.getPlaceholderImage();
            $scope.hasPlaceholderImage = true;
          }
        } else {
          $scope.takeCameraPhoto_Personal(btnIndex);
        }
      });
  };

  $scope.takeCameraPhoto_Personal = function(source) {
    var options = {
      quality: 90,
      destinationType: Camera.DestinationType.FILE_URI,  // write to file
      sourceType: source,
      allowEdit: true,
      encodingType: Camera.EncodingType.JPEG,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false
    };

    $cordovaCamera.getPicture(options).then(
      $scope.addMedia,
      function(err) {
        console.log(err);
    });
  };
})

.controller('WebsiteCtrl', function($scope, $cordovaInAppBrowser){
  console.log("---- WebsiteCtrl");

  $scope.go = function() {
    $cordovaInAppBrowser.open('https://sites.google.com/a/flintlock.net/flintlock16dev/', '_system', {
      location: 'yes'
    });
  };
})

.controller('ShelterSearchCtrl', function ($rootScope, $scope, $state, shelterService) {
  console.log("---- ShelterSearchCtrl");
  shelterService.getAll().then(function(shelters) {
    // clear the markers object without recreating it
    for (var variableKey in $rootScope.markers){
      if ($rootScope.markers.hasOwnProperty(variableKey)){
        delete $rootScope.markers[variableKey];
      }
    }

    console.log("---- got all shelters: ", shelters);
    for (var i = 0; i < shelters.length; i++) {
      var shelter = shelters[i];

      // look for 'point' in wkt and get the pair of numbers in the string after it
      var trimParens = /^\s*\(?(.*?)\)?\s*$/;
      var coordinateString = shelter.geom.toLowerCase().split('point')[1].replace(trimParens, '$1').trim();
      var tokens = coordinateString.split(' ');
      var lng = parseFloat(tokens[0]);
      var lat = parseFloat(tokens[1]);
      var coord = shelterService.getLatLng(shelter.id);
      var detailUrl = '#/vida/shelter-search/shelter-detail/' + shelter.id;

      $rootScope.markers["shelter_" + shelter.id] = {
        draggable: false,
        message: '<div><span style="padding-right: 5px;">' + shelter.name + '</span><a class="icon ion-chevron-right trigger" href=' + detailUrl + '></a></div>',
        lat: coord.lat,
        lng: coord.lng,
        icon: {}
      };
    }
  });
})

.controller('ShelterDetailCtrl', function ($scope, $state, $stateParams, shelterService, $rootScope) {
  console.log("---- ShelterDetailCtrl. shelter id: ", $stateParams.shelterId, shelterService.getById($stateParams.shelterId));
    $scope.shelter = shelterService.getById($stateParams.shelterId);
    $scope.latlng = shelterService.getLatLng($stateParams.shelterId);

    $rootScope.buttonBack = function() {
      // Put edit/delete buttons back
      var tabs = document.getElementsByClassName("tab-item");
      for (var i=0; i < tabs.length; i++) {
        tabs[i].setAttribute('style', 'display: none;');
      }

      var backButton = document.getElementsByClassName("button-person-back");
      var editDeleteButtons = document.getElementsByClassName("button-person-edit");
      for (i=0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].setAttribute('style', 'display: block;');    // Enables buttons
      }
      for (i=0; i < backButton.length; i++) {
        backButton[i].setAttribute('style', 'display: none;');   // Remove button
      }

      window.history.back();
    };

    $scope.$on("$destroy", function(){
      var backButton = document.getElementsByClassName("button-person-back");

      for (i=0; i < backButton.length; i++) {
        backButton[i].setAttribute('style', 'display: none;');   // Remove button
      }
    });

    $scope.buttonShelterHome = function() {
      shelterService.getAll();

      var tabs = document.getElementsByClassName("tab-item");
      for (var i=0; i < tabs.length; i++) {
        tabs[i].setAttribute('style', 'display: block;');
      }

      var backButton = document.getElementsByClassName("button-person-back");
      var editDeleteButtons = document.getElementsByClassName("button-person-edit");
      var saveCancelButtons = document.getElementsByClassName("button-person-post-edit");

      for (i=0; i < saveCancelButtons.length; i++) {
        saveCancelButtons[i].setAttribute('style', 'display: none;');  // remove buttons
      }
      for (i=0; i < editDeleteButtons.length; i++) {
        editDeleteButtons[i].setAttribute('style', 'display: none;');    // remove buttons
      }
      for (i=0; i < backButton.length; i++) {
        backButton[i].setAttribute('style', 'display: none;');   // Remove button
      }

      $state.go('vida.shelter-search');
    }
});