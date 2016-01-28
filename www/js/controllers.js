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

.controller('SettingsCtrl', function($scope, $location, configService, $translate, $cordovaOauth){
  console.log('---------------------------------- SettingsCtrl');

  $scope.networkAddr = configService.getServerAddress();
  $scope.configService = configService;
  $scope.username = configService.getUsername();
  $scope.language_options = [
    {
      "name": 'settings_language_english',
      "value": "English"
    },
    {
      "name": 'settings_language_spanish',
      "value": "Spanish"
    }
  ];

  for(var i = 0; i < $scope.language_options.length; i++){
    if ($scope.language_options[i].value === configService.getLanguage()){
      $scope.current_language = $scope.language_options[i];
    }
  }

  if ($scope.current_language === undefined)
    $scope.current_language = $scope.language_options[0];


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

  $scope.saveServerAddress = function(networkAddr) {
    configService.setServerAddress(networkAddr);
  };

  $scope.switchLanguage = function() {
    if (this.current_language.value === "English")
      $translate.use('en');
    else if (this.current_language.value === "Spanish")
      $translate.use('es');
    else
      $translate.use('en');

    configService.setLanguage(this.current_language.value);
  };
})

.controller('TrackingCtrl', function($scope, $location, configService,
                                     $translate, $interval, geolocationService, trackerService,
                                     $filter, $timeout){
    console.log('---------------------------------- TrackingCtrl');
    $scope.tracking = false;
    $scope.trackingInterval = null;
    $scope.lastSuccess = null;
    $scope.isLoading = false;

    $scope.trackingChanged = function() {
      if ($scope.tracking === false) {
        $scope.tracking = true;
        $scope.trackingStart();
      } else {
        $scope.tracking = false;
        $scope.trackingStop();
      }
      console.log('tracking: ', $scope.tracking);
    };

  $scope.trackingStart = function() {
    console.log('----[ trackingStart');
    if ( $scope.trackingInterval !== null ) return;
    $scope.trackingProcess(); // call immediately and schedule another
    //$scope.trackingInterval = $interval($scope.trackingProcess, 10000);
  };

  $scope.trackingScheduleNext = function() {
    console.log('----[ trackingScheduleNext');
    if ($scope.tracking) {
      if ($scope.trackingInterval !== null) return;
      $scope.trackingInterval = $timeout($scope.trackingProcess, 10000);
    } else {
      console.log('----[ cannot schedule tracking since traking is off.');
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
      console.log('Current location found: ', position);
      trackerService.post(position).then(function(){
        $scope.isLoading = false;
        $scope.lastSuccess = new Date();
        $scope.trackingInterval = null;
        $scope.trackingScheduleNext();
      }, function(error) {
        $scope.isLoading = false;
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username'));
        $scope.trackingInterval = null;
        $scope.trackingScheduleNext();
      });
    }, function (reason) {
      $scope.isLoading = false;
      $cordovaToast.showShortBottom($filter('translate')('dialog_error_username'));
      $ionicLoading.show({
        template: 'Cannot obtain current location. ' + reason,
        duration: 1000
      });
      $scope.trackingInterval = null;
      $scope.trackingScheduleNext();
    });
  };
})

.controller('loginCtrl', function($scope, $location, $http, configService, $filter, $cordovaToast,
                                  loginService, $cordovaProgress){
  console.log('---------------------------------- loginCtrl');
  $scope.username = configService.getUsername();
  $scope.password = configService.getPassword();

  $scope.login = function(gotoUrl) {
    // Request authorization
    if (($scope.username) && ($scope.password)) {
      $cordovaProgress.showSimpleWithLabelDetail(true, "Logging in", "Verifying Credentials");

      loginService.login($scope.username, $scope.password).then(function(){
          $location.path(gotoUrl);
          $cordovaProgress.hide();
        },
        function(){
          $cordovaProgress.hide();
        }
      );
    } else {
      if (!($scope.username) && !($scope.password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username_password'));
      } else if (!($scope.username)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username'));
      } else if (!($scope.password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_password'));
      }
    }
  };

  $scope.saveCredentialsWithoutVerification = function(gotoUrl) {
    if (($scope.username) && ($scope.password)) {
      configService.setAuthentication($scope.username, $scope.password);
      $location.path(gotoUrl);
    } else {
      if (!($scope.username) && !($scope.password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username_password'));
      } else if (!($scope.username)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_username'));
      } else if (!($scope.password)) {
        $cordovaToast.showShortBottom($filter('translate')('dialog_error_password'));
      }
    }
  };
})

.controller('ReportCreateCtrl', function($scope, $rootScope, $stateParams, formService, $cordovaToast, $filter){
  console.log("---- ReportCreateCtrl");
  $scope.lastSuccess = null;
  $scope.isLoading = false;

  $scope.sync = function() {
    if (!$scope.isLoading) {
      $scope.isLoading = true;
      formService.getAll().then(function (forms) {
        console.log("---- got all forms: ", forms);
        for (var i = 0; i < forms.length; i++) {
          forms[i].schema = JSON.parse(forms[i].schema);
        }

        $rootScope.forms = forms;
        $scope.lastSuccess = new Date();
        $scope.isLoading = false;
      }, function() {
        console.log("---- sync, error");
        $cordovaToast.showShortBottom(($filter('translate')('error_server_not_found')));
        $scope.isLoading = false;
      });
    }
  };

  $scope.sync();
})

.controller('ReportDetailCtrl', function($scope, $rootScope, $stateParams, $cordovaActionSheet, $cordovaCamera, $filter,
                                         $ionicLoading, uploadService, utilService, $cordovaProgress){
  console.log("---- ReportDetailCtrl");
  $scope.form = $rootScope.forms[$stateParams.reportId];
  $scope.report = {};
  $scope.mediaPendingUploadMap = {};

  $scope.addMedia = function(filePath) {
    console.log('----[ addMedia: ', filePath);
    if (($scope.report[$scope.getMediaPropName()] instanceof Array) === false) {
      $scope.report[$scope.getMediaPropName()] = [];
    }

    utilService.getFileAsBinaryString(filePath, false).then( function(result) {
      var fileSha1 = new jsSHA("SHA-1", "BYTES");
      fileSha1.update(result);
      filenameSha1 = fileSha1.getHash("HEX") + '.jpg';
      $scope.mediaPendingUploadMap[filenameSha1] = filePath;
      $scope.report[$scope.getMediaPropName()].push(filenameSha1);
      console.log('----[ filenameSha1: ', filenameSha1);
    }, function(err) {
      console.log('---[ error. failed to get media file binary data: ', err);
    });
  };

  $scope.save = function() {
    console.log('----[ save: ', $scope.report);
    $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Uploading Report");
    uploadService.uploadReport($scope.report, $scope.form.resource_uri).then(function() {
      $cordovaProgress.hide();
      $cordovaProgress.showSimpleWithLabelDetail(true, "Saving", "Uploading Media");
      var vals = [];
      for (var key in $scope.mediaPendingUploadMap) {
        vals.push($scope.mediaPendingUploadMap[key]);
      }
      uploadService.uploadMediaArray(vals).then(function(filePathsFailed, filePathsSucceededFileNames){
        console.log('uploadMediaArray completed. original: ', vals, ', fails: ', filePathsFailed, ', succeess: ', filePathsSucceededFileNames);
        $cordovaProgress.hide();
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
    if ('photos' in $scope.form.schema.properties)
      return 'photos';
    if ('Photos' in $scope.form.schema.properties)
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