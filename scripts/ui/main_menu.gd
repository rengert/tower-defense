extends Control

@onready var hello_label: Label = $SafeAreaContainer/VBox/HelloLabel
@onready var version_label: Label = $SafeAreaContainer/VBox/VersionLabel

func _ready() -> void:
	hello_label.text = AppConstants.HELLO_WORLD_TEXT
	version_label.text = AppConstants.VERSION_TEXT
