extends Control

@onready var hello_label: Label = %HelloLabel
@onready var version_label: Label = %VersionLabel

func _ready() -> void:
	hello_label.text = AppConstants.HELLO_WORLD_TEXT
	version_label.text = AppConstants.VERSION_TEXT
