var EXPORTED_SYMBOLS = ['AutoDisableIME'];
 
function AutoDisableIME(aWindow) 
{
	this.init(aWindow);
}
AutoDisableIME.prototype = {
	
	kINACTIVE : '_moz-autodisableime-inactive', 
	kDISABLED : '_moz-autodisableime-disabled',

	kCSSRules : <![CDATA[
		@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");
		@namespace html url("http://www.w3.org/1999/xhtml");

		*|*[_moz-autodisableime-inactive="true"],
		*|*[_moz-autodisableime-inactive="true"] *|* {
			ime-mode: inactive !important;
		}

		*|*[_moz-autodisableime-disabled="true"]:not([focused="true"]),
		*|*[_moz-autodisableime-disabled="true"]:not([focused="true"]) *|* {
			ime-mode: disabled !important;
		}
	]]>.toString(),
 
	get IMEAttribute() 
	{
		return this.isLinux ? this.kDISABLED : this.kINACTIVE ;
	},
	get isLinux()
	{
		return this.XULAppInfo.OS == 'Linux';
	},
	get XULAppInfo()
	{
		return this._XULAppInfo ||
				(this._XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
									.getService(Ci.nsIXULAppInfo)
									.QueryInterface(Ci.nsIXULRuntime));
	},
 
/* Utilities */ 
	
	get urlbar() 
	{
		return this._window.document.getElementById('urlbar');
	},
	urlbarPopups : ['PopupAutoCompleteRichResult', 'PopupAutoComplete'],
  
/* Initializing */ 
	
	init : function(aWindow) 
	{
		if (!('gBrowser' in aWindow)) return;
		this._window = aWindow;

		this.loadStyleSheet();

		this._window.removeEventListener('load', this, false);
		this._window.addEventListener('unload', this, false);

		this._window.document.getElementById('navigator-toolbox').addEventListener('DOMAttrModified', this, false);

		this.initListeners();
	},
 
	destroy : function() 
	{
		this.unloadStyleSheet();
		this._window.removeEventListener('unload', this, false);
		this._window.document.getElementById('navigator-toolbox').removeEventListener('DOMAttrModified', this, false);
		this.destroyListeners();
		this._window = null;
	},
  
/* main */ 
	listening : false,
	
	initListeners : function() 
	{
		if (this.listening) return;

		var self = this;
		var urlbar = this.urlbar;
		if (urlbar) {
			urlbar.setAttribute(this.IMEAttribute, true);
			urlbar.addEventListener('focus', this, true);
			urlbar.addEventListener('blur', this, true);
			this.urlbarPopups.forEach(function(aID) {
				var popup = this._window.document.getElementById(aID);
				popup.addEventListener('popupshowing', self, false);
				popup.addEventListener('popuphiding', self, false);
			});
		}

		this.listening = true;
	},
 
	destroyListeners : function() 
	{
		if (!this.listening) return;

		var self = this;
		var urlbar = this.urlbar;
		if (urlbar) {
			urlbar.removeAttribute(this.IMEAttribute);
			urlbar.removeEventListener('focus', this, true);
			urlbar.removeEventListener('blur', this, true);
			this.urlbarPopups.forEach(function(aID) {
				var popup = this._window.document.getElementById(aID);
				popup.removeEventListener('popupshowing', self, false);
				popup.removeEventListener('popuphiding', self, false);
			});
		}

		this.listening = false;
	},
 
	loadStyleSheet : function()
	{
		if (this._styleSheetPI)
			return;

		this._styleSheetPI = this._window.document.createProcessingInstruction(
			'xml-stylesheet',
			'href="data:text/css,'+encodeURIComponent(this.kCSSRules)+'" type="text/css"'
		);
		this._window.document.insertBefore(this._styleSheetPI, this._window.document.documentElement);
	},
 
	unloadStyleSheet : function()
	{
		if (!this._styleSheetPI)
			return;
		this._window.document.removeChild(this._styleSheetPI);
		this._styleSheetPI = null;
	},
 
	onToolboxCustomizingStateChanged : function(aIsCustomizing) 
	{
		if (aIsCustomizing)
			this.destroyListeners();
		else
			this.initListeners();
	},
 
	onFieldFocus : function(aEvent) 
	{
		if (!this.isLinux) return;

		this._window.setTimeout(function(aSelf, aTarget) {
			aTarget.removeAttribute(aSelf.IMEAttribute);
		}, 10, this, aEvent.currentTarget);
	},
	onFieldBlur : function(aEvent)
	{
		if (!this.isLinux) return;

		this._window.setTimeout(function(aSelf, aTarget) {
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

		this._window.setTimeout(function(aSelf, aPopup) {
			if (aSelf.urlbarPopups.indexOf(aPopup.id) > -1)
				aSelf.urlbar.setAttribute(aSelf.IMEAttribute, true);
		}, 10, this, aEvent.currentTarget);
	},
  
/* event handling */ 
	
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'unload':
				return this.destroy();

			case 'DOMAttrModified':
				if (aEvent.originalTarget == aEvent.currentTarget &&
					aEvent.attrName == 'customizing')
					this.onToolboxCustomizingStateChanged(aEvent.newValue == 'true');
				return;

			case 'focus':
				return this.onFieldFocus(aEvent);

			case 'blur':
				return this.onFieldBlur(aEvent);

			case 'popupshowing':
				return this.onAutoCompleteShown(aEvent);

			case 'popuphiding':
				return this.onAutoCompleteHidden(aEvent);
		}
	}
  
};
  
