// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'vida' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'vida.services' is found in services.js
// 'vida.controllers' is found in controllers.js
// 'vida.services' is found in services.js
var db = null;
angular.module('vida', ['ionic', 'ngCordova', 'vida.directives', 'vida.controllers', 'vida.services', 'leaflet-directive',
    'pascalprecht.translate', 'vida-translations-en', 'vida-translations-es', 'ngResource', 'angularMoment', 'ngCordovaOauth'])

.run(function($q, $ionicPlatform, $window, $cordovaSQLite, configService, localDBService, $cordovaToast, formService,
              $rootScope, reportService) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs).
    // The reason we default this to hidden is that native apps don't usually show an accessory bar, at
    // least on iOS. It's a dead giveaway that an app is using a Web View. However, it's sometimes
    // useful especially with forms, though we would prefer giving the user a little more room
    // to interact with the app.

    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }

    if (window.StatusBar) {
      // Set the statusbar to use the default style, tweak this to
      // remove the status bar on iOS or change it to use white instead of dark colors.
      StatusBar.styleDefault();
    }

    if (window.cordova){
      // ios/android testing
      if (!(window.cordova.plugins)){
        alert("window.cordova.plugins: " + window.cordova.plugins);
      } else {
        if (!(window.cordova.plugins.Keyboard)) {
            alert("window.cordova.plugins.Keyboard: " + window.cordova.plugins.Keyboard);
        }

        // open the local database and load the settings
        localDBService.openLocalDB();

        var promises = [];
        // create the tables needed by the app if not already in the db
        promises.push(localDBService.createKVTableIfNotExist('properties'));
        promises.push(localDBService.createKVTableIfNotExist('forms'));
        promises.push(localDBService.createKVTableIfNotExist('reports'));
        promises.push(localDBService.createKVTableIfNotExist('media'));

        $q.all(promises).then(function(){
          var promises = [];
          promises.push(configService.loadConfig());
          promises.push(formService.loadForms());
          promises.push(reportService.load());
          $q.all(promises).then(function(){
            console.log('Forms: ', formService.getForms());
            $cordovaToast.showLongTop('config & forms loaded');
            $rootScope.$broadcast('appReady');  // configService is ready
            $rootScope.$broadcast('updateBadge');
          });
        });
      }

      if (!(navigator.camera)){
        alert("navigator.camera: " + navigator.camera);
      }
    } else {
      //alert("window.cordova: " + window.cordova);
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

    // Used for getting shelter dropdowns before page is loaded
    var retrieveAllShelters = function(q, netServ, $cordovaProgress) {

      if ($cordovaProgress)
        $cordovaProgress.showSimpleWithLabelDetail(true, 'Loading Page Information', 'Retrieving list of all available shelters..');

      var shelters = q.defer();
      var array = [{
        name: 'None',
        value: '',
        id: 0
      }];
      var auth = netServ.getAuthentication();

      $.ajax({
        type: 'GET',
        xhrFields: {
          withCredentials: true
        },
        url: netServ.getShelterURL(),
        success: function (data) {
          if (data.objects.length > 0) {
            for (var i = 0; i < data.objects.length; i++) {
              array.push({
                name: data.objects[i].name,
                value: data.objects[i].uuid,
                id: data.objects[i].id
              });
            }
          } else {
            console.log('No shelters returned - check url: ' + netServ.getShelterURL() + ' or none are available');
          }

          if ($cordovaProgress)
            $cordovaProgress.hide();
          return shelters.resolve(array);
        },
        error: function () {
          console.log('Error - retrieving all shelters failed');
          if ($cordovaProgress)
            $cordovaProgress.hide();
          return shelters.resolve(array);
        },
        username: auth.username,
        password: auth.password
      });

      return shelters.promise;
    };

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

    // setup an abstract state for the vida directive
  .state('vida', {
    url: "/vida",
    abstract: true,
    templateUrl: "views/vida.html",
    controller: 'AppCtrl'
  })

  // Each tab has its own nav history stack:


  .state('vida.tracking', {
    url: '/tracking',
    views: {
      'view-tracking': {
        templateUrl: 'views/tracking.html',
        controller: 'TrackingCtrl'
      }
    }
  })

  .state('vida.report-create', {
    url: '/report-create',
    views: {
      'view-report-create': {
        templateUrl: 'views/report-create.html',
        controller: 'ReportCreateCtrl'
      }
    }
  })

  .state('vida.report-create.report-detail-new', {
    url: '/report-detail-new/:formId',
    views: {
      'view-report-create@vida': {
        templateUrl: 'views/report-detail.html',
        controller: 'ReportDetailCtrl'
      }
    }
  })

  .state('vida.report-search', {
    url: '/report-search',
    views: {
      'view-website': {
        templateUrl: 'views/report-search.html',
        controller: 'ReportSearchCtrl'
      }
    }
  })

  .state('vida.report-search.report-detail', {
    url: '/report-detail/:reportId',
    views: {
      'view-report-search@vida': {
        templateUrl: 'views/report-detail.html',
        controller: 'ReportDetailCtrl'
      }
    }
  })

  .state('vida.settings', {
    url: '/settings',
    views: {
      'view-settings': {
        templateUrl: 'views/settings.html',
        controller: 'SettingsCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/vida/report-create');
})

.config(['$translateProvider', function ($translateProvider) {
  $translateProvider.preferredLanguage('en');
  $translateProvider.fallbackLanguage('en');
  $translateProvider.useSanitizeValueStrategy('sanitize');
}]);
