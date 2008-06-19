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
			AutoDisableIME.destroyLiteners();
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
		this.destroyLiteners();
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
		if (!this._Prefs) {
			this._Prefs = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
		}
		return this._Prefs;
	},
	_Prefs : null,
 
	getPref : function(aPrefstring) 
	{
		try {
			switch (this.Prefs.getPrefType(aPrefstring))
			{
				case this.Prefs.PREF_STRING:
					return decodeURIComponent(escape(this.Prefs.getCharPref(aPrefstring)));
					break;
				case this.Prefs.PREF_INT:
					return this.Prefs.getIntPref(aPrefstring);
					break;
				default:
					return this.Prefs.getBoolPref(aPrefstring);
					break;
			}
		}
		catch(e) {
		}

		return null;
	},
 
	setPref : function(aPrefstring, aNewValue) 
	{
		var pref = this.Prefs ;
		var type;
		try {
			type = typeof aNewValue;
		}
		catch(e) {
			type = null;
		}

		switch (type)
		{
			case 'string':
				pref.setCharPref(aPrefstring, unescape(encodeURIComponent(aNewValue)));
				break;
			case 'number':
				pref.setIntPref(aPrefstring, parseInt(aNewValue));
				break;
			default:
				pref.setBoolPref(aPrefstring, aNewValue);
				break;
		}
		return true;
	},
 
	clearPref : function(aPrefstring) 
	{
		try {
			this.Prefs.clearUserPref(aPrefstring);
		}
		catch(e) {
		}

		return;
	},
 
	addPrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.addObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	},
 
	removePrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.removeObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	}
   
}; 

window.addEventListener('load', AutoDisableIME, false);
 
