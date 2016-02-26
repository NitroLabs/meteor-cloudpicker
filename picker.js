CloudPicker = {
    _services: []
};

CloudPicker.register = function(name, picker) {
    // Register a new service with Picker
    CloudPicker._services[name] = picker;
    CloudPicker["pickWith" + name] = function(options, callback) {
        if (_.isFunction(options) && !callback) {
            options = {};
            callback = options;
        } else if (!_.isObject(options)) {
            throw new Error("Options must be an object");
        } else if (!_.isFunction(callback)) {
            throw new Error("Callback must be a function");
        }
        var service = new picker();
        service.pick(options, callback, Meteor.user());
    };
};


CloudPicker.download = function(data, callback) {
    var self = this;
    if (!data.service) {
        console.error("The cloud service was not specified");
        callback("The cloud service was not specified");
    } else if (!self._services[data.service]) {
        console.error("No such service: " + data.service);
        callback("No such service: " + data.service);
    }
    // The user provided the name of a registered service
    var service = self._services[data.service];
    service.download(data, callback);
};


CloudPicker.updateQueryString = function(uri, key, value) {
    var re = new RegExp("([?&])"+key+"=.*?(&|$)", "i");
    var separator = uri.indexOf('?') !== -1 ? "&" : "?";
    if (uri.match(re)) {
        return uri.replace(re,'$1'+key+"="+value+'$2');
    } else {
        return uri+separator+key+"="+value;
    }
};
