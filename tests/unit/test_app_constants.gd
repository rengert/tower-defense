extends RefCounted
class_name TestAppConstants

func run() -> Dictionary:
	var failures: Array[String] = []

	if AppConstants.HELLO_WORLD_TEXT.is_empty():
		failures.append("HELLO_WORLD_TEXT darf nicht leer sein")

	if not AppConstants.HELLO_WORLD_TEXT.contains("Hello World"):
		failures.append("HELLO_WORLD_TEXT muss 'Hello World' enthalten")

	if not AppConstants.VERSION_TEXT.begins_with("v"):
		failures.append("VERSION_TEXT muss mit 'v' starten")

	return {
		"name": "test_app_constants",
		"failures": failures
	}
