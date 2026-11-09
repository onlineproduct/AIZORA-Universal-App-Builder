import 'package:flutter/material.dart';

void main() => runApp(const AizoraDemoApp());

class AizoraDemoApp extends StatelessWidget {
  const AizoraDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AIZORA Generated App',
      theme: ThemeData(colorSchemeSeed: Colors.blue, useMaterial3: true),
      home: Scaffold(
        appBar: AppBar(title: const Text('AIZORA Generated App')),
        body: const Center(
          child: Text(
            'Flutter source is ready for APK build.',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
