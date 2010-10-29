import('lib/WindowManager.js');
import("autodisableime.js");

const TYPE_BROWSER = 'navigator:browser';

function handleWindow(aWindow)
{
	if (aWindow.document.documentElement.getAttribute('windowtype') == TYPE_BROWSER &&
		!aWindow.autoDisableIME)
		aWindow.autoDisableIME = new AutoDisableIME(aWindow);
}

WindowManager.getWindows(TYPE_BROWSER).forEach(handleWindow);
WindowManager.addHandler(handleWindow);

function shutdown()
{
	WindowManager.getWindows(TYPE_BROWSER).forEach(function(aWindow) {
		if (aWindow.autoDisableIME)
			aWindow.autoDisableIME.destroy();
	});
}

