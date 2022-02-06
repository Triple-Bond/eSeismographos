#include <SD.h>
#include <SPI.h>

#define x A0 // x_out pin of Accelerometer
#define y A1 // y_out pin of Accelerometer
#define z A2 // z_out pin of Accelerometer

float xsample = 0;
float ysample = 0;
float zsample = 0;

File file;

#define samples 100.0

void setup()
{
  Serial.begin(9600); 

  //Βαθμονόμηση/Calibration
  for (int i = 0; i < samples; i++)
  {
    xsample += analogRead(x);
    ysample += analogRead(y);
    zsample += analogRead(z);

    xsample /= 2;
    ysample /= 2;
    zsample /= 2;
  }

  SD.begin(4);

  file = SD.open("data.txt", FILE_WRITE);
  file.println("new session");
}

void loop()
{
  float x = analogRead(x); // reading x out
  float y = analogRead(y); //reading y out
  float z = analogRead(z); //reading z out

  float xValue = x - xsample;
  float yValue = y - ysample;
  float zValue = z - zsample;

  float combinedMagnitude = (xValue + yValue + zValue) / 3;

  Serial.println(combinedMagnitude);
  file.println(String(combinedMagnitude));
  delay(250);
}
