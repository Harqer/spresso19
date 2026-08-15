#!/bin/bash
echo "Uninstalling existing APK..."
adb -s emulator-5554 uninstall com.spresso19 || true

echo "Installing APK..."
adb -s emulator-5554 install -r -t ./composeApp/build/outputs/apk/debug/composeApp-debug.apk
if [ $? -ne 0 ]; then
  echo "APK Install failed."
  exit 1
fi

echo "Starting Perfetto trace..."
adb -s emulator-5554 shell perfetto -o /data/misc/perfetto-traces/trace_monkey.perfetto-trace -t 15s sched freq idle am wm gfx view binder_driver hal dalvik camera input res memory &
TRACE_PID=$!

echo "Giving trace a moment to start..."
sleep 2

echo "Running Monkey test..."
adb -s emulator-5554 shell monkey -p com.spresso19 -v 500

echo "Waiting for trace to complete..."
wait $TRACE_PID

echo "Pulling trace file..."
adb -s emulator-5554 pull /data/misc/perfetto-traces/trace_monkey.perfetto-trace ./trace_monkey.perfetto-trace
echo "Done."
