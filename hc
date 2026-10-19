Yes! You can use your FarmingRobot HC-05 with Ubuntu to send commands such as forward, backward, left, right, wateron, and wateroff to your Arduino Uno. 🤖

You don't need Windows or Arduino IDE to send commands once your robot program is uploaded.
Step 1 — Pair FarmingRobot with Ubuntu









1. Turn on the robot

Power your Arduino and HC-05 normally, without holding the button.











2. Open Ubuntu Bluetooth settings

Go to Settings → Bluetooth, enable Bluetooth, and select FarmingRobot.

Enter the pairing PIN if requested. Common defaults are 1234 or 0000.



Step 2 — Install the serial terminal
Open Ubuntu Terminal with Ctrl + Alt + T and run:
sudo apt update
sudo apt install bluez rfcomm picocom


Step 3 — Find your HC-05 Bluetooth address
Run:
bluetoothctl


Then enter these commands one at a time:
power on
agent on
default-agent
scan on


Wait for FarmingRobot to appear. Note its Bluetooth address, which looks like 98:D3:31:XX:XX:XX.

Then type:
scan off
quit


Step 4 — Create a serial connection
Replace 98:D3:31:XX:XX:XX below with the actual address of your module.
sudo rfcomm connect /dev/rfcomm0 98:D3:31:XX:XX:XX 1


Keep this terminal open while connected. If Ubuntu has already paired with the HC-05, the connection should establish.

Open a second Terminal and run:
picocom -b 9600 /dev/rfcomm0


The baud rate must match your Arduino sketch's Bluetooth serial speed. 9600 is common for normal HC-05 operation, but use the speed configured in your code.
Step 5 — Send commands
In the picocom terminal, type commands supported by your Arduino program, for example:
forward


left


wateron


Important: Your Arduino code must recognize these exact commands. If your program expects single letters such as F, L, or W, send those instead. Also, your code may require a newline after each command.

To exit picocom, press Ctrl + A, then Ctrl + X.

Want a simpler way?
I can help you create a Python control panel for Ubuntu with Forward, Backward, Left, Right, Water On, and Water Off buttons, plus voice commands. It would send commands through your HC-05 without needing to type them manually.
