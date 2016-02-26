
var options = {}

var callback = function(error,result){
	console.log("Picker success");
	console.log(error,result);
}


Template.googlePicker.events({
	"click .pickerButton":function(){
		CloudPicker.pickWithGoogle(options,callback);
	}
});

Template.dropboxPicker.events({
	"click .pickerButton":function(){
		CloudPicker.pickWithDropbox(options,callback);
	}
});

Template.onedrivePicker.events({
	"click .pickerButton":function(){
		CloudPicker.pickWithOnedrive(options,callback);
	}
});

Template.boxPicker.events({
	"click .pickerButton":function(){
		CloudPicker.pickWithBox(options,callback);
	}
});