# NemPay #

Warning: NemPay Ionic is currently in beta

### What is NemPay ? ###
NemPay is an app to transfer assets in an easy way directly from mobile devices.

NemPay is available for Android and Ios.

NemPay uses NanoWallet, a boilerplate to start building hybrid applications based on the Nano Wallet Beta 1.2.2:
https://forum.nem.io/t/nano-wallet-beta-1-2-2-5-000-xem-bug-bounty/2791

About Ionic Framework:
https://ionicframework.com/

# Developers #
### Build from source ###
1) Open a console to the path of the NanoWallet folder and install all the needed dependencies

<pre>npm install</pre>

1) Install gulp

<pre>npm install -g gulp-cli</pre>

3) Build:

<pre>gulp</pre>

4) Run:
<pre>ionic serve</pre>

### Edit app ###
Under the folder <pre>/apps/nempay</pre>, the source code of the application can be found. To compile it, you should run 
<pre> gulp</pre>
and it will automatically compile the code into 
<pre>/www</pre>
folder


### Known issues ###
-
### Thanks ###
Special thanks to 

- <b>QuantumMechanics: https://github.com/QuantumMechanics</b>  for building NanoWallet

- <b>saulgray:  https://github.com/saulgray/NanoWallet  </b> for building an a usable template for NanoWallet, wich is currently being used by this app.