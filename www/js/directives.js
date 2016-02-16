angular.module('vida.directives', [])
.directive('hideKeyboardOnEnter', function ($window) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      if ($window.cordova && $window.cordova.plugins.Keyboard) {
        element.bind('keyup', function (key) {
          if (key.keyCode === 13) {
            $window.cordova.plugins.Keyboard.close();
            element[0].blur();
          }
        });
      }
    }
  };
})

.directive('errSrc', function() {
    return {
    link: function(scope, element, attrs) {
      element.bind('error', function() {
        if (attrs.src != attrs.errSrc) {
          attrs.$set('src', attrs.errSrc);
        }
      });

      attrs.$observe('ngSrc', function(value) {
        if (!value && attrs.errSrc) {
          attrs.$set('src', attrs.errSrc);
        }
      });
    }
  };
})

.directive('updateHeightOnChange', function() {
  return {
    link: function(scope, element, attrs) {
      scope.updateHeight = function(){
        element.css('height', '1px');
        element.css('height', (20 + element.prop('scrollHeight')) + 'px');
        console.log('heigh adjusted for elem: ', element);
      };

      scope.updateHeight();

      scope.$watch(attrs.ngModel, function (v) {
        scope.updateHeight();
        console.log('value changed, new value is: ' + v);
      });
    }
  };
});