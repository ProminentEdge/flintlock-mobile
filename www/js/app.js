// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'vida' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'vida.services' is found in services.js
// 'vida.controllers' is found in controllers.js
// 'vida.services' is found in services.js
angular.module('vida', ['ionic', 'ngCordova', 'vida.directives', 'vida.controllers', 'vida.services', 'leaflet-directive',
    'pascalprecht.translate', 'vida-translations-en', 'vida-translations-es', 'ngResource'])

.run(function($ionicPlatform, $window) {
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
    var retrieveAllShelters = function(q, netServ) {
      var shelters = q.defer();
      var array = [{
        name: 'None',
        value: '00000000-0000-0000-0000-000000000000'
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
                value: data.objects[i].uuid
              });
            }
            return shelters.resolve(array);
          } else {
            console.log('No shelters returned - check url: ' + netServ.getShelterURL() + ' or none are available');
            return shelters.resolve(array);
          }
        },
        error: function () {
          console.log('Error - retrieving all shelters failed');
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
          shelter_array : function($q, networkService) {
            return retrieveAllShelters($q, networkService);
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
            return retrieveAllShelters($q, networkService);
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
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/vida/person-search');
})

.config(['$translateProvider', function ($translateProvider) {
  $translateProvider.preferredLanguage('en');
  $translateProvider.fallbackLanguage('en');
  $translateProvider.useSanitizeValueStrategy('sanitize');
}]);
