function TransferConfig($stateProvider) {
    'ngInject';

    $stateProvider
        .state('app.transfer', {
            url: '/transfer',
            controller: 'TransferCtrl',
            controllerAs: '$ctrl',
            templateUrl: 'modules/transfer/transfer.html',
            title: 'Transfer',
            activetab: 'transfer'

        });

};

export default TransferConfig;