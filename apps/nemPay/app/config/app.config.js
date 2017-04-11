function AppConfig($httpProvider, $stateProvider, $locationProvider, $urlRouterProvider, ngToastProvider, $translateProvider, $ionicConfigProvider) {
    'ngInject';

    /*
      If you don't want hashbang routing, uncomment this line.
    */
    // $locationProvider.html5Mode(true);

    $stateProvider
        .state('app', {
            abstract: true,
            templateUrl: 'layout/app-view.html'
        });

    $urlRouterProvider.otherwise('/');

    ngToastProvider.configure({
        animation: 'fade'
    });

    $translateProvider.preferredLanguage('en');

    $ionicConfigProvider.tabs.position('bottom');

}

export default AppConfig;