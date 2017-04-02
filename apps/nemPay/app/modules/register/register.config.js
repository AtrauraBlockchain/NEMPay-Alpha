function RegisterConfig($stateProvider) {
    'ngInject';

    $stateProvider
        .state('app.register', {
            url: '/register/:slug',
            controller: 'RegisterCtrl',
            controllerAs: '$ctrl',
            templateUrl: 'modules/register/register.html',
            title: 'Register',
            activetab: 'register'

        });

};

export default RegisterConfig;