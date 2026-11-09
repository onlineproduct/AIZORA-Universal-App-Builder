import 'package:flutter/material.dart';

void main() => runApp(const AizoraApp());

class AizoraApp extends StatelessWidget {
  const AizoraApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: "AIZORA Demo",
    initialRoute: "/page0",
    routes: {
      "/page0": (context) => Page0(),
      "/page1": (context) => Page1(),
    },
  );
}

class Page0 extends StatelessWidget {
  const Page0({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text("Home"), actions: [PopupMenuButton<String>(onSelected: (v) => Navigator.pushReplacementNamed(context, v), itemBuilder: (context) => [
      PopupMenuItem(value: "/page0", child: Text("Home")),
      PopupMenuItem(value: "/page1", child: Text("About")),
    ])]),
    body: SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text("স্বাগতম"),
      Text("Hello AIZORA"),
      ElevatedButton(onPressed: () {}, child: Text("Start")),
      TextField(decoration: InputDecoration(hintText: "Name")),
      const Divider(),
      SizedBox(height: 24),
    ])),
  );
}

class Page1 extends StatelessWidget {
  const Page1({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text("About"), actions: [PopupMenuButton<String>(onSelected: (v) => Navigator.pushReplacementNamed(context, v), itemBuilder: (context) => [
      PopupMenuItem(value: "/page0", child: Text("Home")),
      PopupMenuItem(value: "/page1", child: Text("About")),
    ])]),
    body: SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(width: double.infinity, padding: const EdgeInsets.all(12), child: Text("About page")),
    ])),
  );
}
