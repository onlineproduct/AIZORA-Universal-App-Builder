# যেকোনো Android Gradle প্রজেক্ট থেকে APK তৈরি

এই রিপোজিটরিতে `.github/workflows/build-android-project.yml` নামে GitHub Actions workflow যোগ করা হয়েছে। এটি Android Gradle প্রজেক্টের Debug APK তৈরি করে এবং APK-কে ১৪ দিনের জন্য downloadable artifact হিসেবে রাখে।

## এখন কী কাজ করে
- GitHub Actions থেকে হাতে APK build চালানো।
- `projects/<app-name>/` ফোল্ডারের Android Gradle প্রজেক্ট build করা।
- `gradlew` থাকলে সেটি ব্যবহার করা; না থাকলে runner-এর Gradle ব্যবহার করা।
- Build সফল হলে তৈরি হওয়া APK artifact হিসেবে আপলোড করা।

## Build চালানোর নিয়ম (Android ফোন থেকেও)
1. ZIP-এ Android Studio/Gradle project থাকতে হবে: `settings.gradle` বা `settings.gradle.kts`, root `build.gradle` বা `build.gradle.kts`, এবং সাধারণত `app/` মডিউল।
2. প্রজেক্টটি রিপোজিটরির `projects/my-app/` ফোল্ডারে যোগ করে commit/push করতে হবে। ZIP ফাইলটি শুধু Builder-এর browser-local My Projects-এ থাকলে GitHub Actions সেটি দেখতে পাবে না।
3. GitHub-এ এই workflow খুলুন: `Actions → Build Any Android Project APK → Run workflow`।
4. `project_dir`-এ `projects/my-app` (অথবা আপনার app-এর ফোল্ডার) লিখুন।
5. Build শেষ হলে workflow run খুলে `Artifacts` অংশ থেকে `Android-APK-<run number>` ডাউনলোড করুন। ZIP-এর ভিতর APK থাকবে।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- এটি Gradle-ভিত্তিক Android project-এর জন্য। Flutter, React Native, Unity, Cordova বা অন্য ধরনের প্রজেক্টের আলাদা build toolchain লাগতে পারে।
- Private Maven dependencies, signing keys, environment variables বা অতিরিক্ত SDK থাকলে সেগুলোর জন্য আলাদা configuration লাগতে পারে।
- এটি এখনো browser-এর Build APK button থেকে সরাসরি ZIP upload করে build করে না। Builder UI-তে রাখা ফাইল browser-local storage-এ থাকে; GitHub repository-তে স্বয়ংক্রিয়ভাবে পাঠানো হয় না।
- এটি Debug APK তৈরি করে; Play Store release-এর জন্য secure signing configuration এবং release build আলাদা করে করতে হবে।
- কোনো APK তৈরি হয়েছে বলে দাবি করার আগে সংশ্লিষ্ট GitHub Actions run অবশ্যই সফল হতে হবে।
