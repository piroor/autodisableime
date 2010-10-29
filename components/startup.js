/**
 * @fileOverview Startup service for restartless addons, for Gecko 1.9.x
 * @author       SHIMODA "Piro" Hiroshi
 * @version      1
 *
 * @license
 *   The MIT License, Copyright (c) 2010 SHIMODA "Piro" Hiroshi.
 *   http://www.cozmixng.org/repos/piro/restartless-addon/trunk/license.txt
 * @url http://www.cozmixng.org/repos/piro/restartless-addon/trunk/restartless/
 */

/** You must change ADDON_ID for your addon. */
const ADDON_ID = 'autodisableime@piro.sakura.ne.jp';
/** You must change CLASS_ID for your addon. If must be an UUID. */
const CLASS_ID = '{2ba48940-e301-11df-85ca-0800200c9a66}';

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

/**
 * This component provides ability to load/unload main code of restartless
 * addons, on Gecko 1.9.x (Firefox 3.6 and older). By this component,
 * restartless addons can work as regular addon.
 *
 * Note, this component is completely ignored on Gecko 2.0 and later.
 */
function StartupService() { 
}
StartupService.prototype = {
	classDescription : ADDON_ID+' Startup Service', 
	contractID : '@piro.sakura.ne.jp/'+ADDON_ID.split('@')[0]+'/startup;1',
	classID : Components.ID(CLASS_ID),
	_xpcom_categories : [
		{ category : 'app-startup', service : true }
	],
	QueryInterface : XPCOMUtils.generateQI([
		Ci.nsIObserver,
		Ci.nsICommandLineHandler
	]),
	get root()
	{
		if (!this._root) {
			let addon = this.ExtensionManager.getInstallLocation(ADDON_ID);
			if (addon)
				this._root = addon.getItemFile(ADDON_ID, '').clone();
		}
		return this._root;
	},
	get ObserverService()
	{
		return this._ObserverService ||
			(this._ObserverService = Cc['@mozilla.org/observer-service;1']
									.getService(Ci.nsIObserverService));
	},
	get IOService()
	{
		return this._IOService ||
			(this._IOService = Cc['@mozilla.org/network/io-service;1']
									.getService(Ci.nsIIOService));
	},
	get Loader()
	{
		return this._Loader ||
			(this._Loader = Cc['@mozilla.org/moz/jssubscript-loader;1']
									.getService(Ci.mozIJSSubScriptLoader));
	},
	get Importer()
	{
		if (!this._Importer) {
			this._Importer = {};
			let importer = this.root.clone();
			importer.append('components');
			importer.append('importer.js');
			this.Loader.loadSubScript(this.IOService.newFileURI(importer).spec, this._Importer);
		}
		return this._Importer;
	},
	get ExtensionManager()
	{
		return this._ExtensionManager ||
			(this._ExtensionManager = Cc['@mozilla.org/extensions/manager;1']
									.getService(Ci.nsIExtensionManager));
	},
	observe : function(aSubject, aTopic, aData) 
	{
		switch (aTopic)
		{
			case 'app-startup':
				this.ObserverService.addObserver(this, 'profile-after-change', false);
				return;

			case 'profile-after-change':
				this.ObserverService.removeObserver(this, 'profile-after-change');
				this.ObserverService.addObserver(this, 'quit-application-granted', false);
				this.onStartup();
				return;

			case 'final-ui-startup':
				this.ObserverService.removeObserver(this, 'quit-application-granted');
				this.onShutdown();
				return;
		}
	},
	onStartup : function()
	{
		let main = this.root.clone();
		main.append('modules');
		main.append('main.js');
		this.Importer.import(this.IOService.newFileURI(main).spec);
	},
	onShutdown : function()
	{
		this.Importer.shutdown('APP_SHUTDOWN');
	}
};
var NSGetModule = XPCOMUtils.generateNSGetModule([StartupService]);
