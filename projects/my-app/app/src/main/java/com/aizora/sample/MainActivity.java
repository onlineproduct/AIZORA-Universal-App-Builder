package com.aizora.sample;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.TextView;

public class MainActivity extends Activity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        TextView view = new TextView(this);
        view.setText("AIZORA APK BUILD TEST\n\nBuild workflow is running.");
        view.setTextSize(24);
        view.setTextColor(Color.rgb(25, 45, 80));
        view.setGravity(Gravity.CENTER);
        setContentView(view);
    }
}
