var urlbar;
var win;

function isIMEOpen()
{
	return win
		.QueryInterface(Ci.nsIInterfaceRequestor)
		.getInterface(Ci.nsIDOMWindowUtils)
		.IMEIsOpen;
}

function setUp()
{
	yield Do(utils.setUpTestWindow());
	win = utils.getTestWindow();
	urlbar = $('urlbar', win);
}

function tearDown()
{
	win = null;
	urlbar = null;
	yield Do(utils.tearDownTestWindow());
}

function 
