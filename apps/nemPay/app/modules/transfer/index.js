import angular from 'angular';

// Create the module where our functionality can attach to
let transferModule = angular.module('app.transfer', []);

// Include our UI-Router config settings
import TransferConfig from './transfer.config';
transferModule.config(TransferConfig);

// Controllers
import TransferCtrl from './transfer.controller';
transferModule.controller('TransferCtrl', TransferCtrl);

export default transferModule;
