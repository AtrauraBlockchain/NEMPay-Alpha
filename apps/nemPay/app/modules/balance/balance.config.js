function BalanceConfig($stateProvider) {
    'ngInject';

    $stateProvider
        .state('app.balance', {
            url: '/balance',
            controller: 'BalanceCtrl',
            controllerAs: '$ctrl',
            templateUrl: 'modules/balance/balance.html',
            title: 'Balance'
        });

};

export default BalanceConfig;