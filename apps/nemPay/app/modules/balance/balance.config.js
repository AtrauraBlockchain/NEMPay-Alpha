function BalanceConfig($stateProvider) {
    'ngInject';

    $stateProvider
        .state('app.balance', {
            url: '/balance',
            controller: 'BalanceCtrl',
            controllerAs: '$ctrl',
            templateUrl: 'modules/balance/balance.html',
            title: 'Balance',
            activetab: 'balance'

        });

};

export default BalanceConfig;