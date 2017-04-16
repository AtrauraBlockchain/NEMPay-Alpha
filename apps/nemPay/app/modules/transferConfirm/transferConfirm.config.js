function TransferConfirmConfig($stateProvider) {
    'ngInject';

    $stateProvider
        .state('app.transferConfirm', {
            url: '/transfer-confirm',
            controller: 'TransferConfirmCtrl',
            controllerAs: '$ctrl',
            templateUrl: 'modules/transferConfirm/transferConfirm.html',
            title: 'Transfer',
            activetab: 'transferConfirm',
            params: {
                to: '',
                alias: '',
                amount: '',
                divisibility: '',
                mosaic: '',
                message: ''
            }
        });

};

export default TransferConfirmConfig;