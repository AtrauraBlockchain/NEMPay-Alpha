import angular from 'angular';

// Create the module where our functionality can attach to
let transferConfirmModule = angular.module('app.transferConfirm', []);

// Include our UI-Router config settings
import TransferConfirmConfig from './transferConfirm.config';
transferConfirmModule.config(TransferConfirmConfig);

// Controllers
import TransferConfirmCtrl from './transferConfirm.controller';
transferConfirmModule.controller('TransferConfirmCtrl', TransferConfirmCtrl);

export default transferConfirmModule;
