# AIZORA Builder Android App

এই Android অ্যাপটি AIZORA Universal App Builder-এর মোবাইল অ্যাপ শেল। অ্যাপটি চালু হলে বর্তমান প্রকাশিত Builder সাইট খুলবে:

https://onlineproduct.github.io/AIZORA-Universal-App-Builder/

## APK build

GitHub Actions workflow: `.github/workflows/android-apk.yml`

1. GitHub repository-এর **Actions** ট্যাব খুলুন।
2. **Build AIZORA Builder Android APK** workflow নির্বাচন করুন।
3. **Run workflow** চাপুন এবং branch হিসেবে `android-apk` নির্বাচন করুন (অথবা এই branch-এ পরিবর্তন push হলে workflow নিজে চলবে)।
4. সফল হলে workflow run-এর **Artifacts** অংশ থেকে `AIZORA-Builder-Android-APK` ডাউনলোড করুন।
5. ZIP ফাইলটি Extract করে `app-debug.apk` ইনস্টল করুন।

## বর্তমান সীমাবদ্ধতা

- এটি Debug APK; Play Store release signing সেটআপ করা হয়নি।
- অ্যাপের মূল Builder UI অনলাইন Pages সাইট থেকে লোড হয়, তাই ইন্টারনেট দরকার।
- এই Android shell নিজে থেকে APK compile করে না। Generated app build করতে Builder-এর নিজস্ব GitHub Actions/build integration আলাদাভাবে কার্যকর থাকতে হবে।
- GitHub Actions build সফল না হওয়া পর্যন্ত APK প্রস্তুত বলে গণ্য হবে না.
