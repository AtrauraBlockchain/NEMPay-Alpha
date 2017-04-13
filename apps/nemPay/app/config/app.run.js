function AppRun(AppConstants, $rootScope, $timeout, Wallet,$ionicPlatform) {
    'ngInject';

        $ionicPlatform.ready(function () {
            // // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // // for form inputs)
             if (window.cordova && window.cordova.plugins.Keyboard) {
                 cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
             }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleDefault();
            }
        });

}

export default AppRun;
