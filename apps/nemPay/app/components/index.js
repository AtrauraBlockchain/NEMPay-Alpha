import angular from 'angular';

// Create the module where our functionality can attach to
let componentsnempayModule = angular.module('app.componentsnempay', []);


// Set tag-transaction directive
import NemPayTransaction from './nempayTransaction.directive';
componentsnempayModule.directive('nempayTransaction', NemPayTransaction);

export default componentsnempayModule;