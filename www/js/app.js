// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'vida' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'vida.services' is found in services.js
// 'vida.controllers' is found in controllers.js
// 'vida.services' is found in services.js
var db = null;
angular.module('vida', ['ionic', 'ngCordova', 'vida.directives', 'vida.controllers', 'vida.services', 'leaflet-directive',
    'pascalprecht.translate', 'vida-translations-en', 'vida-translations-es', 'ngResource', 'angularMoment'])

.run(function($ionicPlatform, $window, $cordovaSQLite, networkService, optionService) {
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

        db = $cordovaSQLite.openDB("localDB.db");
        var query = 'CREATE TABLE IF NOT EXISTS configuration (settings TEXT)';
        var querySelect = 'SELECT * FROM configuration';
        var defaultSettings = optionService.getDefaultConfigurationsJSON();
        var queryIns = 'INSERT INTO configuration VALUES (' + defaultSettings + ')';
        $cordovaSQLite.execute(db, query);
        $cordovaSQLite.execute(db, querySelect).then(function(result){
          if (result.rows.length <= 0){
            $cordovaSQLite.execute(db, queryIns); // add default configuration row if doesn't exist
            console.log(queryIns);
          }
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

  .state('login', {
    url: '/login',
    templateUrl: 'views/login.html',
    controller: 'loginCtrl'
  })


    // setup an abstract state for the vida directive
  .state('vida', {
    url: "/vida",
    abstract: true,
    templateUrl: "views/vida.html",
    controller: 'AppCtrl'
  })

  // Each tab has its own nav history stack:


  .state('vida.person-create', {
    url: '/person-create',
    views: {
      'view-person-create': {
        templateUrl: 'views/person-create.html',
        resolve: {
          shelter_array : function($q, networkService, $cordovaProgress) {
            return retrieveAllShelters($q, networkService, $cordovaProgress);
          }
        },
        controller: 'PersonCreateCtrl'
      }
    }
  })

  .state('vida.person-search', {
    url: '/person-search',
    views: {
      'view-person-search': {
        templateUrl: 'views/person-search.html',
        controller: 'PersonSearchCtrl'
      }
    }
  })

  .state('vida.person-search.person-detail', {
    url: "/person-detail/:personId",
    views: {
      'view-person-search@vida': {
        templateUrl: "views/person-detail.html",
        resolve: {
          shelter_array : function($q, networkService) {
            return retrieveAllShelters($q, networkService, false);
          }
        },
        controller: 'PersonDetailCtrl'
      }
    }
  })

  .state('vida.person-search.person-detail.person-edit', {
    url: "/person-edit",
    views: {
      'view-person-search@vida': {
        templateUrl: "views/person-create.html",
        resolve: {
          shelter_array : function($q, networkService) {
            return retrieveAllShelters($q, networkService, false);
          }
        },
        controller: 'PersonDetailEditCtrl'
      }
    }
  })

  .state('vida.shelter-search', {
    url: '/shelter-search',
    views: {
      'view-shelter-search': {
        templateUrl: 'views/shelter-search.html',
        controller: 'ShelterSearchCtrl'
      }
    }
  })

  .state('vida.shelter-search.shelter-detail', {
    url: '/shelter-detail/:shelterId',
    views: {
      'view-shelter-search@vida': {
        templateUrl: 'views/shelter-detail.html',
        controller: 'ShelterDetailCtrl'
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
  })

  .state('vida.tracking', {
    url: '/tracking',
    views: {
      'view-tracking': {
        templateUrl: 'views/tracking.html',
        controller: 'TrackingCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/vida/tracking');
})

.config(['$translateProvider', function ($translateProvider) {
  $translateProvider.preferredLanguage('en');
  $translateProvider.fallbackLanguage('en');
  $translateProvider.useSanitizeValueStrategy('sanitize');
}]);
