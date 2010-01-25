var AutoDisableIME = { 
	kINACTIVE : '_moz-autodisableime-inactive',
	kDISABLED : '_moz-autodisableime-disabled',

	get IMEAttribute()
	{
		return this.isLinux ? this.kDISABLED : this.kINACTIVE ;
	},
	isLinux : (navigator.platform.toLowerCase().indexOf('linux') > -1),

	enabledForURLBar : false,
	 
/* Utilities */ 
	 
	get urlbar() 
	{
		return document.getElementById('urlbar');
	},
	urlbarPopups : ['PopupAutoCompleteRichResult', 'PopupAutoComplete'],
  
/* Initializing */ 
	 
	init : function() 
	{
		if (!('gBrowser' in window)) return;

		window.removeEventListener('load', this, false);
		window.addEventListener('unload', this, false);

		window.__autodisableime__BrowserCustomizeToolbar = window.BrowserCustomizeToolbar;
		window.BrowserCustomizeToolbar = function() {
			AutoDisableIME.destroyListeners();
			window.__autodisableime__BrowserCustomizeToolbar.call(window);
		};

		var toolbox = document.getElementById('browser-toolbox') || // Firefox 3
					document.getElementById('navigator-toolbox'); // Firefox 2
		if (toolbox.customizeDone) {
			toolbox.__autodisableime__customizeDone = toolbox.customizeDone;
			toolbox.customizeDone = function(aChanged) {
				this.__autodisableime__customizeDone(aChanged);
				AutoDisableIME.initListeners();
			};
		}
		if ('BrowserToolboxCustomizeDone' in window) {
			window.__autodisableime__BrowserToolboxCustomizeDone = window.BrowserToolboxCustomizeDone;
			window.BrowserToolboxCustomizeDone = function(aChanged) {
				window.__autodisableime__BrowserToolboxCustomizeDone.apply(window, arguments);
				AutoDisableIME.initListeners();
			};
		}

		this.initListeners();
		this.addPrefListener(this);
		this.observe(null, 'nsPref:changed', 'extensions.autodisableime.urlbar');
	},
 
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);
		this.destroyListeners();
		this.removePrefListener(this);
	},
  
/* main */ 
	initialized : false,
	 
	initListeners : function() 
	{
		if (this.initialized) return;

		var self = this;
		var urlbar = this.urlbar;
		if (urlbar) {
			urlbar.setAttribute(this.IMEAttribute, true);
			urlbar.addEventListener('focus', this, true);
			urlbar.addEventListener('blur', this, true);
			this.urlbarPopups.forEach(function(aID) {
				var popup = document.getElementById(aID);
				popup.addEventListener('popupshowing', self, false);
				popup.addEventListener('popuphiding', self, false);
			});
		}

		this.initialized = true;
	},
 
	destroyListeners : function() 
	{
		if (!this.initialized) return;

		var self = this;
		var urlbar = this.urlbar;
		if (urlbar) {
			urlbar.removeAttribute(this.IMEAttribute);
			urlbar.removeEventListener('focus', this, true);
			urlbar.removeEventListener('blur', this, true);
			this.urlbarPopups.forEach(function(aID) {
				var popup = document.getElementById(aID);
				popup.removeEventListener('popupshowing', self, false);
				popup.removeEventListener('popuphiding', self, false);
			});
		}

		this.initialized = false;
	},
 
	onFieldFocus : function(aEvent) 
	{
		if (!this.isLinux) return;

		window.setTimeout(function(aSelf, aTarget) {
			aTarget.removeAttribute(aSelf.IMEAttribute);
		}, 10, this, aEvent.currentTarget);
	},
	onFieldBlur : function(aEvent) 
	{
		if (!this.isLinux) return;

		window.setTimeout(function(aSelf, aTarget) {
			aTarget.setAttribute(aSelf.IMEAttribute, true);
		}, 10, this, aEvent.currentTarget);
	},
 
	onAutoCompleteShown : function(aEvent) 
	{
		if (this.isLinux) return;

		if (this.urlbarPopups.indexOf(aEvent.currentTarget.id) > -1)
			this.urlbar.removeAttribute(this.IMEAttribute);
	},
	onAutoCompleteHidden : function(aEvent) 
	{
		if (this.isLinux) return;

		window.setTimeout(function(aSelf, aPopup) {
			if (aSelf.urlbarPopups.indexOf(aPopup.id) > -1)
				aSelf.urlbar.setAttribute(aSelf.IMEAttribute, true);
		}, 10, this, aEvent.currentTarget);
	},
 	 
/* event handling */ 
	 
	domain : 'extensions.autodisableime', 
	observe : function(aSubject, aTopic, aData)
	{
		if (aTopic != 'nsPref:changed') return;

		var value = this.getPref(aData);
		switch (aData)
		{
			case 'extensions.autodisableime.urlbar':
				this.enabledForURLBar = value;
				this.destroyListeners();
				this.initListeners();
				break;
		}
	},
 
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				return;

			case 'unload':
				this.destroy();
				return;

			case 'focus':
				this.onFieldFocus(aEvent);
				return;

			case 'blur':
				this.onFieldBlur(aEvent);
				return;

			case 'popupshowing':
				this.onAutoCompleteShown(aEvent);
				return;

			case 'popuphiding':
				this.onAutoCompleteHidden(aEvent);
				return;
		}
	},
  
/* Save/Load Prefs */ 
	 
	get Prefs() 
	{
		delete this.Prefs;
		this.Prefs = Components
						.classes['@mozilla.org/preferences;1']
						.getService(Components.interfaces.nsIPrefBranch)
						.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
		return this.Prefs;
	},
 
	getPref : function(aPrefstring) 
	{
		if (!this.Prefs.prefHasUserValue(aPrefstring))
			return null;

		switch (this.Prefs.getPrefType(aPrefstring))
		{
			case this.Prefs.PREF_STRING:
				return decodeURIComponent(escape(this.Prefs.getCharPref(aPrefstring)));

			case this.Prefs.PREF_INT:
				return this.Prefs.getIntPref(aPrefstring);

			default:
				return this.Prefs.getBoolPref(aPrefstring);
		}
	},
 
	setPref : function(aPrefstring, aNewValue) 
	{
		switch (typeof aNewValue)
		{
			case 'string':
				return this.Prefs.setCharPref(aPrefstring, unescape(encodeURIComponent(aNewValue)));

			case 'number':
				return this.Prefs.setIntPref(aPrefstring, parseInt(aNewValue));

			default:
				return this.Prefs.setBoolPref(aPrefstring, aNewValue);
		}
	},
 
	clearPref : function(aPrefstring) 
	{
		if (this.Prefs.prefHasUserValue(aPrefstring))
			this.Prefs.clearUserPref(aPrefstring);
	},
 
	addPrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			for each (var domain in domains)
				this.Prefs.addObserver(domain, aObserver, false);
		}
		catch(e) {
		}
	},
 
	removePrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			for each (var domain in domains)
				this.Prefs.removeObserver(domain, aObserver, false);
		}
		catch(e) {
		}
	}
   
}; 

window.addEventListener('load', AutoDisableIME, false);
 
