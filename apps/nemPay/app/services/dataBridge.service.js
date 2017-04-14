import helpers from '../utils/helpers';
import Address from '../utils/Address';

/** Service to open connection, store and process data received from websocket. */
class DataBridge {

    /**
     * Initialize services and properties
     *
     * @param {config} AppConstants - The Application constants
     * @param {service} Alert - The Alert service
     * @param {service} NetworkRequests - The NetworkRequests service
     * @param {service} Wallet - The Wallet service
     * @param {service} $timeout - The angular $timeout service
     * @param {service} $filter - The angular $filter service
     */
    constructor(AppConstants, Alert, NetworkRequests, Wallet, $timeout, $filter, $rootScope) {
        'ngInject';

        /***
         * Declare services
         */
        this._Alert = Alert;
        this._$timeout = $timeout;
        this._AppConstants = AppConstants;
        this._Wallet = Wallet;
        this._NetworkRequests = NetworkRequests;
        this._$filter = $filter;
        this._$rootScope = $rootScope;

        /***
         * Default DataBridge properties
         */

         /**
         * The nis height
         *
         * @type {number}
         */
        this.nisHeight = 0;

        /**
         * The connection status
         *
         * @type {boolean}
         */
        this.connectionStatus = false;

        /**
         * The account meta data pair
         *
         * @type {object|undefined}
         */
        this.accountData = undefined;

        /**
         * The recent transactions
         *
         * @type {array}
         */
        this.transactions = [];

        /**
         * The unconfirmed transactions
         *
         * @type {array}
         */
        this.unconfirmed = [];

        /**
         * The mosaic definition meta data pair
         *
         * @type {object}
         */
        this.mosaicDefinitionMetaDataPair = {};

        /**
         * The mosaic definition meta data pair size
         *
         * @type {number}
         */
        this.mosaicDefinitionMetaDataPairSize = 0;

        /**
         * The mosaics owned
         *
         * @type {object}
         */
        this.mosaicOwned = {};

        /**
         * The mosaics owned size
         *
         * @type {object}
         */
        this.mosaicOwnedSize = {};

        /**
         * The namespaces owned
         *
         * @type {object}
         */
        this.namespaceOwned = {};

        /**
         * The harvested blocks
         *
         * @type {array}
         */
        this.harvestedBlocks = [];

        /**
         * The connector
         *
         * @type {object|undefined}
         */
        this.connector = undefined;

        /**
         * The delegated data
         *
         * @type {object|undefined}
         */
        this.delegatedData = undefined;

        /**
         * The market information
         *
         * @type {object|undefined}
         */
        this.marketInfo = undefined;

        /**
         * The Bitcoin price value
         *
         * @type {object|undefined}
         */
        this.btcPrice = undefined;

        /**
         * The network time
         *
         * @type {number}
         */
        this.networkTime = undefined;

        /**
         * Store the time sync interval function
         *
         * @type {setInterval}
         */
        this.timeSyncInterval = undefined;
    }

    /**
     * Open websocket connection
     *
     * @param {object} connector - A connector object
     */
    openConnection(connector) {

        // Store the used connector to close it from anywhere easily
        this.connector = connector;

        // Connect
        connector.connect(() => {

            // Reset at new connection
            this.reset();

            // Start time sync
            this.timeSync();

            /***
             * Few network requests happen on socket connection
             */

             /**
             * Fetch network time
             */
            this._NetworkRequests.getNEMTime(helpers.getHostname(this._Wallet.node)).then((res) => {
                this._$timeout(() => {
                    this.networkTime = res.receiveTimeStamp / 1000;
                });
            },(err) => {
                this._$timeout(() => {
                    this._Alert.errorGetTimeSync();
                });
            });

            // Gets current height
            this._NetworkRequests.getHeight(helpers.getHostname(this._Wallet.node)).then((height) => {
                    this._$timeout(() => {
                        this.nisHeight = height;
                    });
                },
                (err) => {
                    this._$timeout(() => {
                        this.nisHeight = this._$filter('translate')('GENERAL_ERROR');
                    });
                });

            // Gets harvested blocks
            this._NetworkRequests.getHarvestedBlocks(helpers.getHostname(this._Wallet.node), this._Wallet.currentAccount.address).then((blocks) => {
                    this._$timeout(() => {
                        this.harvestedBlocks = blocks.data;
                    });
                },
                (err) => {
                    // Alert error
                    this._$timeout(() => {
                        this.harvestedBlocks = [];
                    });
                });

            // Gets delegated data
            this._NetworkRequests.getAccountData(helpers.getHostname(this._Wallet.node), Address.toAddress(this._Wallet.currentAccount.child, this._Wallet.network)).then((data) => {
                    this._$timeout(() => {
                        this.delegatedData = data;
                    });
                },
                (err) => {
                    this._$timeout(() => {
                        this.delegatedData = "";
                        this._Alert.getAccountDataError(err.data.message);
                    });
                });

            // Gets market info
            this._NetworkRequests.getMarketInfo().then((data) => {
                    this._$timeout(() => {
                        this.marketInfo = data;

                    });
            },
            (err) => {
                    this._$timeout(() => {
                        this._Alert.errorGetMarketInfo();
                        this.marketInfo = undefined;
                    });
            });

            // Gets btc price
            this._NetworkRequests.getBtcPrice().then((data) => {
                    this._$timeout(() => {
                        this.btcPrice = data;
                    });
            },
            (err) => {
                    this._$timeout(() => {
                        this._Alert.errorGetBtcPrice();
                        this.btcPrice = undefined;
                    });
            });

            // Set connection status
            this._$timeout(() => {
                this.connectionStatus = true;
            })


            // Account data
            connector.on('account', (d) => {
                this._$timeout(() => {
                    this.accountData = d;
                    // prepare callback for multisig accounts
                    for (let i = 0; i < this.accountData.meta.cosignatoryOf.length; i++) {
                        connector.onConfirmed(confirmedCallback, this.accountData.meta.cosignatoryOf[i].address);
                        connector.onUnconfirmed(unconfirmedCallback, this.accountData.meta.cosignatoryOf[i].address);
                        connector.onNamespace(namespaceCallback, this.accountData.meta.cosignatoryOf[i].address);
                        connector.onMosaicDefinition(mosaicDefinitionCallback, this.accountData.meta.cosignatoryOf[i].address);
                        connector.onMosaic(mosaicCallback, this.accountData.meta.cosignatoryOf[i].address);

                        connector.subscribeToMultisig(this.accountData.meta.cosignatoryOf[i].address);
                        connector.requestAccountNamespaces(this.accountData.meta.cosignatoryOf[i].address);
                        connector.requestAccountMosaicDefinitions(this.accountData.meta.cosignatoryOf[i].address);
                        connector.requestAccountMosaics(this.accountData.meta.cosignatoryOf[i].address);
                    }
                }, 0);
            });

            // Recent transactions
            connector.on('recenttransactions', (d) => {
                d.data.reverse();
                this._$timeout(() => {
                    this.transactions = d.data;

                 });
                this._$rootScope.$emit('RECENT_TRANSACTIONS_LOADED', '');
                console.log("recenttransactions data: ", d);

            }, 0);

            // On confirmed we push the tx in transactions array and delete the tx in unconfirmed if present
            //*** BUG: it is triggered twice.. NIS websocket issue ? ***//
            let confirmedCallback = (d) => {
                this._$timeout(() => {
                    if (!helpers.haveTx(d.meta.hash.data, this.transactions)) { // Fix duplicate bug
                        this.transactions.push(d);
                        let audio = new Audio('vendors/ding2.ogg');
                        audio.play();
                        console.log("Confirmed data: ", d);
                        // If tx present in unconfirmed array it is removed
                        if (helpers.haveTx(d.meta.hash.data, this.unconfirmed)) {
                            // Get index
                            let txIndex = helpers.getTransactionIndex(d.meta.hash.data, this.unconfirmed);
                            // Remove from array
                            this.unconfirmed.splice(txIndex, 1);
                        }
                    }
                }, 0);
            }

            // On unconfirmed we push the tx in unconfirmed transactions array
            //*** BUG: same as confirmedCallback ***//
            let unconfirmedCallback = (d) => {
                this._$timeout(() => {
                    if (!helpers.haveTx(d.meta.hash.data, this.unconfirmed)) { //Fix duplicate bug
                        this.unconfirmed.push(d);
                        let audio = new Audio('vendors/ding.ogg');
                        audio.play();
                        // If not sender show notification
                        if (this._$filter('fmtPubToAddress')(d.transaction.signer, this._Wallet.network) !== this._Wallet.currentAccount.address) {
                            this._Alert.incomingTransaction(d.transaction.signer, this._Wallet.network);
                        }
                        console.log("Unconfirmed data: ", d);
                    }

                    if(undefined !== d.transaction.mosaics && d.transaction.mosaics.length) {
                        for (let i = 0; i < d.transaction.mosaics.length; i++) {
                            let mos = d.transaction.mosaics[i];
                            if(undefined === this.mosaicDefinitionMetaDataPair[helpers.mosaicIdToName(mos.mosaicId)]){
                                // Fetch definition from network
                                getMosaicDefinitionMetaDataPair(mos);
                            }
                        }
                    }
                }, 0);
            }

            // On error we show it in an alert
            connector.on('errors', (name, d) => {
                console.log(d);
                this._Alert.websocketError(d.error + " " + d.message);
            });

            // New blocks
            connector.on('newblocks', (blockHeight) => {
                this._$timeout(() => {
                    this.nisHeight = blockHeight.height;
                }, 0);
            });

            // Mosaic definition meta data pair callback
            let mosaicDefinitionCallback = (d) => {
                this._$timeout(() => {
                    this.mosaicDefinitionMetaDataPair[helpers.mosaicIdToName(d.mosaicDefinition.id)] = d;
                    this.mosaicDefinitionMetaDataPairSize = Object.keys(this.mosaicDefinitionMetaDataPair).length;
                }, 0);
            }

            // Mosaics owned callback
            let mosaicCallback = (d, address) => {
                this._$timeout(() => {
                    let mosaicName = helpers.mosaicIdToName(d.mosaicId);
                    if (!(address in this.mosaicOwned)) {
                        this.mosaicOwned[address] = {};
                    }
                    this.mosaicOwned[address][mosaicName] = d;
                    this.mosaicOwnedSize[address] = Object.keys(this.mosaicOwned[address]).length;
                }, 0);
            }

            // Namespaces owned callback
            let namespaceCallback = (d, address) => {
                this._$timeout(() => {
                    let namespaceName = d.fqn;
                    if (!(address in this.namespaceOwned)) {
                        this.namespaceOwned[address] = {};
                    }
                    this.namespaceOwned[address][namespaceName] = d;
                    // Check namespace expiration date
                    // Creation height of ns + 1 year in blocks (~60 blocks per hour * 24h * 365d) - current height < 1 month in blocks (60 blocks per hour * 24h * 30d)
                    if(d.height + 525600 - this.nisHeight <= 43200 && d.fqn.indexOf('.') === -1) {
                        this._$timeout(() => {
                            this._Alert.namespaceExpiryNotice(d.fqn, d.height + 525600 - this.nisHeight);
                        });                  
                    }
                }, 0);
            }

            let getMosaicDefinitionMetaDataPair = (mos) => {
                if (undefined !== mos.mosaicId) {
                    // Fetch definition from network
                    return this._NetworkRequests.getOtherMosaic(helpers.getHostname(this._Wallet.node), mos.mosaicId.namespaceId).then((res) => {
                        if(res.data.length) {
                            for(let i = 0; i < res.data.length; i++) {
                                if (res.data[i].mosaic.id.namespaceId == mos.mosaicId.namespaceId && res.data[i].mosaic.id.name == mos.mosaicId.name) {
                                    this.mosaicDefinitionMetaDataPair[helpers.mosaicIdToName(mos.mosaicId)] = {};
                                    this.mosaicDefinitionMetaDataPair[helpers.mosaicIdToName(mos.mosaicId)].supply = res.data[i].mosaic.properties[1].value;
                                    this.mosaicDefinitionMetaDataPair[helpers.mosaicIdToName(mos.mosaicId)].mosaicDefinition = res.data[i].mosaic;

                                    if(undefined !== res.data[i].mosaic.levy) {
                                        if(undefined === this.mosaicDefinitionMetaDataPair[helpers.mosaicIdToName(res.data[i].mosaic.levy.mosaicId)]) {
                                            // Fetch definition from network
                                            return getMosaicDefinitionMetaDataPair(res.data[i].mosaic.levy);
                                        }
                                    }
                                }
                            }
                        }
                    },
                    (err) => {
                        this._Alert.transactionError('Failed to fetch definition of ' + helpers.mosaicIdToName(mos.mosaicId));
                    });
                }
            }


            // Set websockets callbacks
            connector.onConfirmed(confirmedCallback);
            connector.onUnconfirmed(unconfirmedCallback);
            connector.onMosaic(mosaicCallback);
            connector.onMosaicDefinition(mosaicDefinitionCallback);
            connector.onNamespace(namespaceCallback);

            // Request data
            connector.requestAccountData();
            connector.requestAccountTransactions();
            connector.requestAccountMosaicDefinitions();
            connector.requestAccountMosaics();
            connector.requestAccountNamespaces();

        });

    }

    /**
     * Reset DataBridge service properties
     */
    reset() {
        this.nisHeight = 0;
        this.connectionStatus = false;
        this.accountData = undefined;
        this.transactions = [];
        this.unconfirmed = [];
        this.mosaicDefinitionMetaDataPair = {};
        this.mosaicDefinitionMetaDataPairSize = 0;
        this.mosaicOwned = {};
        this.mosaicOwnedSize = {};
        this.namespaceOwned = {};
        this.harvestedBlocks = [];
        this.delegatedData = undefined;
        this.marketInfo = undefined;
        this.networkTime = undefined;
        clearInterval(this.timeSyncInterval)
    }

    /**
     * Fetch network time every minute
     */
    timeSync() {
        this.timeSyncInterval = setInterval(() => { 
            this._NetworkRequests.getNEMTime(helpers.getHostname(this._Wallet.node)).then((res) => {
                this._$timeout(() => {
                    this.networkTime = res.receiveTimeStamp / 1000;
                });
            },(err) => {
                this._$timeout(() => {
                    this._Alert.errorGetTimeSync();
                });
            });
        }, 60 * 1000);
    }

}

export default DataBridge;