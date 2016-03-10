angular.module('vida.controllers', ['ngCordova.plugins.camera', 'pascalprecht.translate'])


.controller('AppCtrl', function($rootScope, $scope, $ionicModal, $timeout, $translate, configService) {
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
})

.controller('SettingsCtrl', function($scope, $location, configService, $translate, $cordovaOauth, $ionicPopup,
                                     localDBService, $rootScope, $cordovaToast, $cordovaInAppBrowser, loginService,
                                     $http, $state, reportService, utilService, mediaService, mapService){
  console.log('---------------------------------- SettingsCtrl');

  $scope.configService = configService;
  $scope.reportService = reportService;
  $scope.isPushingMedia = false;
  $scope.developer = { state: false };

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

  $scope.deauthorize = function() {
    configService.resetAuthorizationConfig();
    configService.saveConfig().then(function(){
      $state.go('vida.report-create');
    });
  };

  $scope.authorizeWithGoogle = function() {
    if (utilService.isConnected()) {
      loginService.loginGoogle().then(function () {
        $cordovaToast.showShortBottom('Authorization suceeded');
        $state.go('vida.report-create');
      }, function () {
        console.log('==== authorization failed! ====');
      });
    } else {
      $cordovaToast.showShortBottom('Cannot authorize without network connectivity');
    }
  };

  $scope.authorizeWithDjango = function() {
    $state.go('login');
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

  $scope.updateBasemap = function() {
    mapService.updateBasemap();
  };

  $scope.pushMedia = function() {
    console.log('---------- pushMedia');
    if ($scope.isPushingMedia === false) {
      $scope.isPushingMedia = true;

      var onSuccess = function(){
        $scope.isPushingMedia = false;
        $rootScope.$broadcast('updateBadge');
        $cordovaToast.showShortBottom('Completed pushing media');
      };

      var onError = function(){
        $scope.isPushingMedia = false;
      };

      localDBService.getRowsCount('media').then(function (count) {
        if (count > 0) {
          $ionicPopup.confirm({
            title: 'Push Media',
            template: 'Push the ' + count + ' media as opposed to a full sync?'
          }).then(function (res) {
            if (res) {
              mediaService.pushMedia().then(onSuccess, onError);
            } else {
              onError();
            }
          });
        } else {
          $scope.isPushingMedia = false;
          $cordovaToast.showShortBottom('No media to push');
        }
      }, onError);
    }
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
      $scope.trackingInterval = $timeout($scope.trackingProcess, 60000);
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
      trackerService.push(position, $scope.mayday.state).then(function(){
        $scope.isLoading = false;
        configService.getConfig().trackinglastSuccess = new Date();
        configService.saveConfig();
        $scope.trackingInterval = null;
        $scope.trackingScheduleNext();
      }, function(error) {
        $scope.isLoading = false;
        $scope.trackingInterval = null;
        $scope.trackingScheduleNext();
      });
    }, function (reason) {
      $scope.isLoading = false;
      $scope.trackingInterval = null;
      $scope.trackingScheduleNext();
    });
  };
})

.controller('loginCtrl', function($scope, $location, $http, configService, $filter, $cordovaToast,
                                  loginService, $cordovaProgress, $state){
  console.log('---------------------------------- loginCtrl');
  $scope.configService = configService;

  $scope.login = function(verify) {
    // Request authorization
    if ((configService.getConfig().username) && (configService.getConfig().password)) {
      configService.saveConfig();
      if (verify) {
        $cordovaProgress.showSimpleWithLabelDetail(true, "Logging in", "Verifying Credentials");

        loginService.loginDjango(configService.getConfig().username, configService.getConfig().password).then(function () {
            $state.go('vida.report-create');
            $cordovaProgress.hide();
          },
          function () {
            $cordovaProgress.hide();
          }
        );
      } else {
        $state.go('vida.report-create');
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
                                         localDBService, utilService, reportService, mediaService, configService){
  console.log("---- ReportCreateCtrl");
  $scope.configService = configService;
  $scope.isLoading = false;
  $scope.formService = formService;

  $rootScope.$on('updateBadge', function(){
    $scope.updateBadge();
  });

  $scope.updateBadge = function() {
    var deferred = $q.defer();
    var onError = function() {
      console.log('Badge update failed.');
      deferred.reject();
    };

    //-- update badge for pending reports & media
    localDBService.getRowsCount('reports').then(function (reports) {
      $rootScope.pendingReportsCount = reports;
      localDBService.getRowsCount('media').then(function (media) {
        $rootScope.pendingMediaCount = media;
        deferred.resolve();
      }, onError);
    }, onError);
    return deferred.promise;
  };

  $scope.sync = function() {
    if (!$scope.isLoading) {
      $scope.isLoading = true;

      //-- pull forms
      formService.pullFroms().then(function(forms) {
        //--save forms
        formService.saveForms().then(function() {
          //-- push reports
          localDBService.getAllRows('reports').then(function (result) {
            var reports = localDBService.getAllRowsValues(result, true);
            var reportsKeys = localDBService.getAllRowsKeys(result);
            var promisesUpload = [];
            for (var index in reports) {
              promisesUpload.push(reportService.uploadReport(reports[index]));
            }
            $q.all(promisesUpload).then(function () {
              //-- remove pushed reports from local db
              var promises = [];
              for (var index in reportsKeys) {
                promises.push(localDBService.removeKey('reports', reportsKeys[index]));
              }
              $q.all(promises).then(function () {
                //-- push media
                var mediaCompleted = function(){
                  //-- update badge for pending reports
                  $rootScope.$broadcast('updateBadge');
                  configService.getConfig().syncLastSuccess = new Date();
                  configService.saveConfig();
                  $scope.isLoading = false;
                  utilService.notify('Sync Completed.');
                };

                mediaService.pushMedia().then(function(){
                  mediaCompleted();
                }, function(resp){
                  utilService.notify('Media push failed. ' + resp.succeeded.length + ' of ' + resp.failed.length + ' succeeded.');
                  mediaCompleted();
                });
              }, function () {
                utilService.notify('failed to remove pushed reports');
                $scope.isLoading = false;
              });
            }, function (e) {
              utilService.notify('failed to push reports: ' + e);
              $scope.isLoading = false;
            });
          }, function () {
            console.log("---- sync, error");
            $cordovaToast.showShortBottom(($filter('translate')('error_server_not_found')));
            $scope.isLoading = false;
          });
        }, function() {
          utilService.notify('failed to remove all existing forms from local db');
        });
      }, function (e) {
        console.log('====[ Error: ', e);
        $scope.isLoading = false;
      });
    }
  };
})

.controller('ReportDetailCtrl', function($scope, $rootScope, $stateParams, $cordovaActionSheet, $cordovaCamera, $filter,
                                         $ionicLoading, reportService, utilService, localDBService, geolocationService,
                                         $cordovaToast, $cordovaProgress, $q, $state, formService, $window, $cordovaFile,
                                         $cordovaFileTransfer){
  console.log("---- ReportDetailCtrl");
  $scope.formService = formService;
  $scope.reportService = reportService;
  $scope.report = null;
  $scope.mediaPendingUploadMap = {};
  $scope.createNewReportMode = null;
  $scope.reportOriginal = null;

  // only when creating a new report, formId will be passed in
  if (typeof $stateParams.formId !== 'undefined') {
    $scope.createNewReportMode = true;
  } else if (typeof $stateParams.reportId !== 'undefined') {
    $scope.createNewReportMode = false;
  }

  if ($scope.createNewReportMode) {
    var form = formService.getById($stateParams.formId);
    $scope.report = reportService.getNew(form);
    formService.setCurrentForm($stateParams.formId);
  } else {
    $scope.reportOriginal = reportService.get()[$stateParams.reportId];
    $scope.report = {};
    // the copy of the report before we start to change it
    angular.copy($scope.reportOriginal, $scope.report);
    formService.setCurrentForm(formService.uriToId($scope.report.form));
  }

  // iOS:  store pics in temp folder needs to be moved to application folder
  // Android: pics from library have uri 'content://....' format
  $scope.addMedia = function(tempFilePath) {
    var deferred = $q.defer();
    console.log('----[ addMedia, report: ', $scope.report, ', tempfile: ', tempFilePath);
    console.log('----[ platform.ionic: ', ionic.Platform.isIOS());

    $window.resolveLocalFileSystemURL(tempFilePath, function(fileSystem) {
      console.log('tempFilePath fileSystem: ', fileSystem);
      // iOS: uri returned from camera / library points to a file in tmp folder which will be removed when
      //      application is resatrted. Need to move file to application folder first.
      //
      // Android: when choosing from library/gallery on NEWER androids, it is not a file path. instead something like:
      //          content://com.google.android.apps.photos.contentprovider/-1/1/content%3A%2F%2Fmedia%2Fexternal%2Fimages%2Fmedia%2F85271/ACTUAL/2115746354
      //          can download it using file transfer but got permission error.
      //
      // Other option is to just get teh image as base64 encoded string from 'camera' (DATA_URL) and write a file.
      if (tempFilePath.indexOf('content://') !== 0) {
        // read the file and compute the file name using sha1
        utilService.getFileAsBinaryString(tempFilePath, false).then(function(result) {
          var filenameSha1 = utilService.getSHA1(result) + '.jpg';

          //Move the temp file to permanent storage
          var localFileInfo = utilService.getFilePathComponents(tempFilePath);
          $cordovaFile.copyFile(localFileInfo.dir, localFileInfo.filename,
            cordova.file.dataDirectory, filenameSha1).then(function(success){
            console.log('----[ media added: ', success.nativeURL);
            $scope.mediaPendingUploadMap[filenameSha1] = success.nativeURL;
            $scope.report.data[formService.getMediaPropName(formService.getCurrentForm())].push(filenameSha1);
            deferred.resolve();
          }, function(error){
            deferred.reject(error);
            utilService.notify('Failed to copy media to permanent storage: ' + error);
          });
        }, function(err) {
          deferred.reject(err);
          console.log('---[ error. failed to get media file binary data: ', err);
        });
      } else {
        deferred.reject('not supported');
        utilService.notify('Cannot use file from library on this version of the OS');
      }
    }, function(e) {
      console.log('fileSystem failed. e ', e);
      deferred.reject(e);
    });

    return deferred.promise;
  };

  $scope.save = function() {
    console.log('----[ save: ', $scope.report);

    $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Retrieving gps location");
    geolocationService.getCurrentPosition().then(function(position) {
      $cordovaProgress.hide();
      $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Saving report to local DB");
      // prepare the report
      $scope.report.timestamp_local = new Date(); // help make the object and hence the hash unique
      $scope.report.geom = {
        'coordinates': [
          position.coords.longitude,
          position.coords.latitude
        ],
        'type': 'Point'
      };

      reportService.add($scope.report).then(function() {
        //TODO: implement foreachWaitForCompletionAsync such that it can call setKey and pass all arguments to it
        var promises = [];
        for (var key in $scope.mediaPendingUploadMap) {
          promises.push(localDBService.setKey('media', key, $scope.mediaPendingUploadMap[key], false));
        }
        $q.all(promises).then(function() {
          $scope.mediaPendingUploadMap = {};
          $cordovaProgress.hide();

          var done = function() {
            $rootScope.$broadcast('updateBadge');
            utilService.notify("Report saved to local db");
            $state.go('^');
          };

          if ($scope.createNewReportMode) {
            done();
          } else {
            reportService.remove($scope.reportOriginal).then(function(){
              done();
            }, function() {
              utilService.notify("failed remove older copy of the edited report");
            });
          }
        },
        function(){
          utilService.notify("failed to save media to local db: " + key);
          $cordovaProgress.hide();
        });
      });
    }, function() {
      $cordovaProgress.hide();
    });
  };

  $scope.delete = function() {
    console.log('----[ delete: ', $scope.report);

    var options = {
      title: 'Delete this report?',
      buttonLabels: ['Yes', 'No'],
      addCancelButtonWithLabel: $filter('translate')('modal_cancel'),
      androidEnableCancelButton : true,
      winphoneEnableCancelButton : true
    };

    $cordovaActionSheet.show(options).then(function(btnIndex) {
      if (btnIndex === 1) {
        $cordovaProgress.showSimpleWithLabelDetail(true, "Deleting", "Removing report");
        reportService.remove($scope.report).then(function() {
          $cordovaProgress.hide();
          $state.go('^');
        });
      }
    });
  };

  $scope.showHint = function(msg) {
    console.log('----[ ', msg);
    $ionicLoading.show({
      template: msg,
      duration: 2000
    });
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

    $cordovaActionSheet.show(options).then(function(btnIndex) {
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
      quality: 30,  // 1 is terrible with missing colors.
                    // for low bandwidth environments, 30 seems to be decent. 400kb vs 2.1 MB
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

.controller('ReportSearchCtrl', function($scope, $rootScope, reportService, formService, mapService, leafletMapEvents, leafletMarkerEvents){
  console.log("---- ReportSearchCtrl");
  $scope.reportService = reportService;
  $scope.formService = formService;
  $scope.mapMode = true;

  $scope.markers = mapService.get();
  $scope.center = {
    lat: 30,
    lng: -100,
    zoom: 3
  };

  $scope.toggleMode = function() {
    $scope.mapMode = !$scope.mapMode;
    mapService.updateMarkers();
  };

  $scope.events = {
    path: {
      enable: [ 'click', 'mouseover' ],
      logic: 'emit'
    },
    map: {
      enable: leafletMapEvents.getAvailableMapEvents(),
      logic: 'emit'
    },
    markers: {
      enable: leafletMarkerEvents.getAvailableEvents(),
      logic: 'emit'
    }
  };


  var mapEvents = leafletMapEvents.getAvailableMapEvents();
  console.log('mapEvents: ', mapEvents);
  for (var k in mapEvents){
    var eventName = 'leafletDirectiveMap.' + mapEvents[k];
    $scope.$on(eventName, function(event){
      console.log('---- ', event.name);
    });
  }

  $scope.$on("leafletDirectiveMap.click", function(event, args){
    console.log('====================================== chk1');
  });


  //$scope.$on("leafletDirectiveMarker.dragend", function(event, args){
  //  console.log('hola');
  //  $scope.markers.m1.lat = args.model.lat;
  //  $scope.markers.m1.lng = args.model.lng;
  //});


  //mapService.setView(-50, 20, 10);
});



