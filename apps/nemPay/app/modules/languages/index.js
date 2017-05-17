import angular from 'angular';

// Create the module where our functionality can attach to
let app = angular.module('app.lang', ['pascalprecht.translate']);

// Include languages
import EnglishProvider from './en';
app.config(EnglishProvider);

export default app;