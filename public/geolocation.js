$(document).ready(function() {
    var $x = $("#error");
    var $lati = $(".latitude");
    var $longi = $(".longitude");
    var $lat = $("#lat");
    var $lon = $("#lon");
    getLocation();

    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition, showError);
        }
        else {
            $x.text("Geolocation is not supported by this browser.");
        }
    }

    function showPosition(position) {
        $lat.text(position.coords.latitude);
        $lon.text(position.coords.longitude);


    }

    function showError(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                $x.text("User denied the request for Geolocation. You cant login.");
                break;
            case error.POSITION_UNAVAILABLE:
                $x.text("Location information is unavailable. You cant login.");
                break;
            case error.TIMEOUT:
                $x.text("The request to get user location timed out. You cant login.");
                break;
            case error.UNKNOWN_ERROR:
                $x.text("An unknown error occurred. You cant login.");
                break;
        }
    }
});
