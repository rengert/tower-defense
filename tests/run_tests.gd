extends SceneTree

const TEST_SCRIPTS: Array[Script] = [
	preload("res://tests/unit/test_app_constants.gd")
]

func _initialize() -> void:
	var total_failures: int = 0

	for test_script: Script in TEST_SCRIPTS:
		var test_instance: RefCounted = test_script.new()
		var result: Dictionary = test_instance.run()
		var failures: Array = result.get("failures", [])

		if failures.is_empty():
			print("PASS: %s" % result.get("name", test_script.resource_path))
		else:
			total_failures += failures.size()
			print("FAIL: %s" % result.get("name", test_script.resource_path))
			for failure: String in failures:
				print("  - %s" % failure)

	if total_failures > 0:
		print("Tests failed: %d" % total_failures)
		quit(1)
		return

	print("All tests passed")
	quit(0)
