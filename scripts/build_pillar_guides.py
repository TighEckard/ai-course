#!/usr/bin/env python3
"""Writes long-form guides to /guides/<slug>/index.html using the site's guide template. Idempotent."""
import re, json, os, html
e=lambda x:html.escape(x,quote=True)
tpl=open('guides/how-to-write-a-good-prompt/index.html').read()
head=tpl[:tpl.index('<script type="application/ld+json">')]
style=re.search(r'<style>.*?</style></head>',tpl,re.S).group(0)
body_open=tpl[tpl.index('<body>'):tpl.index('<main>')+6]
foot=tpl[tpl.index('</main>'):]
TODAY='2026-11-15'
G=[]
def cta(slug,h='Try a live class with a real teacher',p='Your first class is free. Small groups of 12 or fewer on Zoom, no experience needed.'):
    return '<div class="cta"><h2>%s</h2><p>%s</p><a class="btn" href="/?src=guide-%s#reserve">Reserve a free seat</a></div>'%(h,p,slug)
def prompt(t): return '<div class="prompt"><small>Copy and paste</small><p>%s</p></div>'%t

# ---------- 1
G.append(dict(slug='ai-classes-for-seniors',
 title='AI Classes for Seniors: How to Find a Good One (Free and Paid)',
 desc='Looking for AI classes for seniors? Compare libraries, community programs, online videos and live classes, and learn what to look for before you sign up.',
 lede='If you are over 60 and want to learn ChatGPT or other AI tools, you have more choices than you might think. This guide compares the main places to learn, what a good beginner class should include, and the red flags to avoid.',
 related=['am-i-too-old-to-learn-ai','online-ai-class-vs-youtube-videos','free-tech-help-at-libraries-and-senior-centers'],
 body='''<h2>Where older adults can learn AI</h2>
<p>There is no single best place. The right one depends on whether you like learning in person, at home, alone or with others. Here are the common options.</p>
<ul class="loc">
<li><b>Public libraries.</b> Many libraries offer free computer and technology help. Ask the front desk whether they run any classes on AI tools or can book a one-on-one session. Offerings differ a lot from one library to the next.</li>
<li><b>Senior centers and community organizations.</b> Some host technology workshops. These are often free or low cost and a good way to meet neighbors. You can find your local Area Agency on Aging with the <a href="https://eldercare.acl.gov/" rel="noopener">Eldercare Locator</a>.</li>
<li><b>Community colleges and adult education.</b> Look for continuing education or non-credit courses. Check the course description to see whether it is current, because AI tools change quickly.</li>
<li><b>Free video tutorials.</b> You can learn a lot on your own, but videos do not answer your questions and can drift out of date. Our guide on <a href="/guides/online-ai-class-vs-youtube-videos/">online AI class versus YouTube videos</a> explains the tradeoffs.</li>
<li><b>Live online classes.</b> A live class on Zoom lets you ask questions out loud and join from home, which helps if travel, weather or mobility makes in-person classes hard.</li></ul>
<h2>What a good beginner AI class should include</h2>
<ol class="steps"><li><b>It starts from zero.</b> You should not need to know what a prompt is or how to install anything. The teacher should walk through opening the tool on your phone or computer.</li>
<li><b>It is small enough for questions.</b> In a group of 12 or fewer, everyone can speak. In a group of 200, most people stay silent and get lost.</li>
<li><b>It uses your real life.</b> The best practice is on things you actually do: writing an email, reading a confusing letter, planning a trip, checking a suspicious message.</li>
<li><b>It teaches safety first.</b> A good class explains what never to type into a chatbot, how scams use AI voices and fake messages, and how to double check important answers.</li>
<li><b>It does not sell you anything else.</b> You should never be asked for passwords, bank details or gift cards, and the price should be clear before you pay.</li></ol>
<h2>Red flags to watch for</h2>
<ul class="loc"><li><b>Pressure to pay today.</b> A real class lets you try before you commit.</li><li><b>Requests for passwords or account access.</b> A teacher never needs these.</li><li><b>Promises that AI will make you rich.</b> Beginner classes teach practical skills, not get-rich schemes.</li><li><b>Hidden fees.</b> Ask what the total cost is each month and how to cancel.</li></ul>
<h2>Free ways to start this week</h2>
<p>You do not have to pay anything to begin. ChatGPT, Claude and Gemini all offer free versions. Open one on your phone, and try a question like this:</p>
'''+prompt('I am new to AI. Explain in three short sentences what you can help me with, and suggest three simple things I could ask you to do this week.')+'''
<p>If the answer is helpful, ask a follow-up. If it is confusing, say so and ask for a simpler version. Our guide on <a href="/guides/how-to-write-a-good-prompt/">how to write a good AI prompt</a> shows an easy pattern for better answers.</p>
<h2>How Riside classes work</h2>
<p>Riside Learning runs live AI classes for adults on Zoom, taught by Holden Eckard. Groups hold 12 or fewer people. Classes meet Tuesday and Thursday at 7 pm Eastern with a Saturday 10 am Eastern backup. Your first class is free, then membership is $46 a month and you can cancel any time. Every class is recorded for members, so a missed week is never lost.</p>
'''+cta('ai-classes-for-seniors')+'''
<h2>Common questions</h2>
<details><summary>Are AI classes hard for older adults?</summary><p>No. If you can open a web page or send a text message, you have the skills you need. A good class goes at the pace of the slowest learner in the room.</p></details>
<details><summary>Do I need a new computer or phone?</summary><p>No. Most phones, tablets and computers from the last several years work. You need internet and, for a live class, a camera and speaker.</p></details>
<details><summary>Is it safe for beginners to use ChatGPT?</summary><p>Yes, if you follow a few rules, mainly never typing passwords, bank details or full medical records. Read <a href="/guides/is-ai-safe-to-use/">Is AI safe to use?</a> for the full list.</p></details>
<details><summary>What if I fall behind?</summary><p>Ask questions as often as you like. In a small group, nobody minds, and recordings let you rewatch anything.</p></details>''',
 faq=[("Are AI classes hard for older adults?","No. If you can open a web page or send a text message, you have the skills you need. A good class goes at the pace of the slowest learner in the room."),("Do I need a new computer or phone?","No. Most phones, tablets and computers from the last several years work. You need internet and, for a live class, a camera and speaker."),("Is it safe for beginners to use ChatGPT?","Yes, if you follow a few rules, mainly never typing passwords, bank details or full medical records."),("What if I fall behind?","Ask questions as often as you like. In a small group, nobody minds, and recordings let you rewatch anything.")]))

# ---------- 2
G.append(dict(slug='free-ai-classes-for-beginners-online',
 title='Free AI Classes for Beginners Online: 6 Ways to Start Today',
 desc='A practical list of free ways to learn AI as a beginner: live classes, library help, free chatbot versions and simple practice exercises you can do today.',
 lede='You can learn to use ChatGPT, Claude and Gemini without spending anything. Here are six free ways to start, what each is good for, and a simple one-week plan for beginners.',
 related=['best-free-ai-tools-for-beginners','what-is-chatgpt','how-to-write-a-good-prompt'],
 body='''<h2>Six free ways to start learning AI</h2>
<ol class="steps">
<li><b>Join a free live class.</b> Riside offers a free first class on Zoom for adults, in a group of 12 or fewer, with no card needed. It is a low-pressure way to see how everything works before deciding anything.</li>
<li><b>Use the free version of a chatbot.</b> ChatGPT, Claude and Gemini each have a free option. Free versions have usage limits and fewer features, but they are plenty for learning. See <a href="/guides/best-free-ai-tools-for-beginners/">the best free AI tools for beginners</a>.</li>
<li><b>Ask your library.</b> Many public libraries offer free technology help or classes. Call or stop by and ask whether anyone teaches AI tools.</li>
<li><b>Read plain-English guides.</b> Short guides with copy-and-paste prompts let you practice immediately. Start with <a href="/guides/what-is-chatgpt/">what is ChatGPT</a>.</li>
<li><b>Ask the AI to teach you.</b> A chatbot is a patient tutor. Tell it you are a beginner and ask for one small lesson at a time.</li>
<li><b>Practice on a real task.</b> Pick something you need to do anyway, such as a thank-you note, a grocery list or a letter to a landlord, and let AI help.</li></ol>
<h2>A simple one-week plan</h2>
<table><tr><th>Day</th><th>What to try (10 to 15 minutes)</th></tr>
<tr><td>Day 1</td><td>Open a free chatbot and ask it what it can help with.</td></tr>
<tr><td>Day 2</td><td>Ask it to explain something you have always wondered about, in plain words.</td></tr>
<tr><td>Day 3</td><td>Have it help write a short email or note you actually need to send.</td></tr>
<tr><td>Day 4</td><td>Practice follow-up questions: ask it to make the answer shorter, warmer or simpler.</td></tr>
<tr><td>Day 5</td><td>Plan something real: a meal plan, a day trip or a weekend to-do list.</td></tr>
<tr><td>Day 6</td><td>Test it on a message you are unsure about, as a second opinion on whether it could be a scam.</td></tr>
<tr><td>Day 7</td><td>Review what worked, and write down your three favorite prompts.</td></tr></table>
<h2>A first prompt to try</h2>
'''+prompt('I am a complete beginner. Teach me one useful thing about using AI today in under 150 words, then give me one small exercise to try.')+'''
<h2>What free does not give you</h2>
<p>Free options are great for getting started. What they usually do not give you is a person who watches what you are doing and answers your question right then. That is where a live class helps. If you get stuck, you can ask and get an answer that fits you.</p>
<div class="tip"><b>Good to know.</b> Whatever you use, never type passwords, bank numbers or full medical records into a chatbot. Our guide <a href="/guides/what-never-to-type-into-ai-chatbot/">what never to type into an AI chatbot</a> has the complete list.</div>
'''+cta('free-ai-classes-for-beginners-online','Start with a free live class','Join a free class on Zoom. Small group, no experience needed, no card required.')+'''
<h2>Common questions</h2>
<details><summary>Is there really a free AI class?</summary><p>Yes. Riside Learning offers a first class free. If you enjoy it, membership is $46 a month and you can cancel any time.</p></details>
<details><summary>Do I need to download anything?</summary><p>For a Zoom class you need the free Zoom app or a web browser. For a chatbot you can use the website or the free app.</p></details>
<details><summary>How long does it take to learn the basics?</summary><p>Most beginners feel comfortable asking questions and writing simple requests within a week or two of regular practice.</p></details>''',
 faq=[("Is there really a free AI class?","Yes. Riside Learning offers a first class free. If you enjoy it, membership is $46 a month and you can cancel any time."),("Do I need to download anything?","For a Zoom class you need the free Zoom app or a web browser. For a chatbot you can use the website or the free app."),("How long does it take to learn the basics?","Most beginners feel comfortable asking questions and writing simple requests within a week or two of regular practice.")]))

# ---------- 3
G.append(dict(slug='what-to-expect-in-your-first-live-ai-class',
 title='What to Expect in Your First Live AI Class (Step by Step)',
 desc='Nervous about your first online AI class? Here is exactly what happens before, during and after a live beginner AI class on Zoom.',
 lede='Joining a live class for the first time can feel intimidating, especially if you have never used Zoom or ChatGPT. Here is exactly what happens, so you know what to expect.',
 related=['video-calling-family-zoom-facetime-whatsapp','am-i-too-old-to-learn-ai','how-to-write-a-good-prompt'],
 body='''<h2>Before class</h2>
<ol class="steps"><li><b>Reserve a seat.</b> You choose a time and enter your first name and email. No card is needed for the first class.</li>
<li><b>Look for the email.</b> You will receive the class details and the Zoom link. Check your spam folder if you do not see it.</li>
<li><b>Test your device.</b> A phone, tablet or computer with a speaker and camera works. Open the Zoom link a few minutes early so there are no surprises.</li>
<li><b>Open a chatbot if you like.</b> If you want to follow along, have ChatGPT, Claude or Gemini ready. You can also just watch the first time.</li></ol>
<h2>During class</h2>
<p>Riside classes are about an hour, led live by Holden Eckard, in groups of 12 or fewer. Here is the usual flow.</p>
<ul class="loc"><li><b>A friendly start.</b> Everyone says hello. You can leave your camera off if you prefer.</li><li><b>One idea at a time.</b> The teacher shows each step on screen, slowly, using everyday examples.</li><li><b>Your questions.</b> You can unmute and ask out loud or type in the chat. There is no such thing as a silly question.</li><li><b>Hands-on practice.</b> You try the idea yourself on something from your own life.</li></ul>
<h2>After class</h2>
<p>If you enjoy it, you can continue with membership at $46 a month, which includes a live class every week, and every class is recorded for members. You can cancel any time, from your PayPal account or by email. If it is not for you, there is nothing to cancel because the first class is free and no card is needed.</p>
<h2>Common worries</h2>
<details><summary>What if I cannot figure out Zoom?</summary><p>Most people manage by tapping the link in their email. Our guide on <a href="/guides/video-calling-family-zoom-facetime-whatsapp/">video calling with Zoom, FaceTime and WhatsApp</a> walks through it. You can also email us before class.</p></details>
<details><summary>What if I am the slowest person there?</summary><p>That is common and fine. Small groups mean the teacher can go at a pace that works, and recordings let you review.</p></details>
<details><summary>Will I have to share personal information?</summary><p>No. You never need to share passwords, bank details or private records. Practice uses made-up or general examples.</p></details>
<details><summary>Do I need to speak?</summary><p>No. You can listen, type in the chat, or speak when you feel ready.</p></details>
'''+cta('what-to-expect-in-your-first-live-ai-class','Ready to see for yourself?','Reserve a free seat. Small group, no experience needed.'),
 faq=[("What if I cannot figure out Zoom?","Most people manage by tapping the link in their email. You can also email us before class."),("What if I am the slowest person there?","That is common and fine. Small groups mean the teacher can go at a pace that works, and recordings let you review."),("Will I have to share personal information?","No. You never need to share passwords, bank details or private records."),("Do I need to speak?","No. You can listen, type in the chat, or speak when you feel ready.")]))

# ---------- 4
G.append(dict(slug='how-to-learn-chatgpt-for-beginners',
 title='How to Learn ChatGPT for Beginners: A Simple Step-by-Step Path',
 desc='Learn ChatGPT from scratch: how to start, what to ask, how to fix a bad answer, and the safety rules every beginner should know.',
 lede='ChatGPT is easiest to learn by using it a little each day. This step-by-step path takes you from your first question to using it confidently for everyday tasks.',
 related=['what-is-chatgpt','how-to-write-a-good-prompt','how-to-ask-ai-follow-up-questions'],
 body='''<h2>Step 1: Open it and say hello</h2>
<p>Go to chatgpt.com or install the app. You can ask questions without creating an account in some cases, but an account lets you save conversations. Type a simple message to begin.</p>
'''+prompt('Hello. I am brand new to this. Please explain what you can do in simple words.')+'''
<h2>Step 2: Ask real questions</h2>
<p>Treat it like a very well-read assistant. Ask for explanations, ideas, summaries and drafts. Specific questions get better answers than vague ones.</p>
<h2>Step 3: Give context</h2>
<p>The more the AI knows about what you need, the better it helps. Say who you are, what the answer is for, and how long or how simple it should be. Our guide on <a href="/guides/how-to-write-a-good-prompt/">writing a good prompt</a> has the full pattern.</p>
<h2>Step 4: Follow up instead of starting over</h2>
<p>If the answer is close but not right, reply as you would to a person: make it shorter, use simpler words, give me three options. See <a href="/guides/how-to-ask-ai-follow-up-questions/">how to ask AI follow-up questions</a>.</p>
<h2>Step 5: Check important answers</h2>
<p>AI can sound certain and still be wrong, a problem called hallucination. For health, money, legal or safety decisions, verify with a trusted source or professional. Read <a href="/guides/ai-mistakes-and-how-to-check/">why AI makes mistakes</a>.</p>
<h2>Step 6: Protect your privacy</h2>
<p>Do not type passwords, bank or card numbers, Social Security numbers or private medical records. When asking about a letter, remove names and account numbers first. See <a href="/guides/keep-private-information-safe-using-ai/">keeping private information safe</a>.</p>
<h2>Step 7: Make it a habit</h2>
<p>Pick one small daily use, like drafting an email, planning dinner or asking a question you are curious about. Ten minutes a day builds skill faster than one long session a month.</p>
<h2>Learning with others</h2>
<p>Many people learn faster with a teacher who can answer questions in the moment. Riside runs live beginner classes on Zoom in groups of 12 or fewer. The first class is free.</p>
'''+cta('how-to-learn-chatgpt-for-beginners')+'''
<h2>Common questions</h2>
<details><summary>Is ChatGPT free?</summary><p>There is a free version with limits and paid plans with more features. Beginners can learn everything here on the free version.</p></details>
<details><summary>Do I need to pay for ChatGPT to learn it?</summary><p>No. The free version is enough to learn the basics.</p></details>
<details><summary>Is ChatGPT the only option?</summary><p>No. Claude and Gemini work in a similar way. Our guide <a href="/guides/chatgpt-vs-claude-vs-gemini/">ChatGPT vs Claude vs Gemini</a> helps you choose.</p></details>''',
 faq=[("Is ChatGPT free?","There is a free version with limits and paid plans with more features. Beginners can learn everything here on the free version."),("Do I need to pay for ChatGPT to learn it?","No. The free version is enough to learn the basics."),("Is ChatGPT the only option?","No. Claude and Gemini work in a similar way.")]))

urls=[]
for g in G:
    url='https://riside.com/guides/%s/'%g['slug']; urls.append((g,url))
    h=head
    h=re.sub(r'<title>.*?</title>','<title>%s | Riside Learning</title>'%e(g['title']),h)
    for pat in [r'(<meta name="description" content=")[^"]*',r'(<meta property="og:description" content=")[^"]*']:
        h=re.sub(pat,'\\g<1>'+e(g['desc']),h)
    h=re.sub(r'(<meta property="og:title" content=")[^"]*','\\g<1>'+e(g['title'])+' | Riside Learning',h)
    h=re.sub(r'(rel="canonical" href=")[^"]*','\\g<1>'+url,h)
    h=re.sub(r'(<meta property="og:url" content=")[^"]*','\\g<1>'+url,h)
    ld=[{"@context":"https://schema.org","@type":"Article","headline":g['title'],"description":g['desc'],"mainEntityOfPage":url,"inLanguage":"en","datePublished":TODAY,"dateModified":TODAY,"author":{"@type":"Organization","name":"Riside Learning"},"publisher":{"@id":"https://riside.com/#org"},"image":"https://riside.com/images/og-image.jpg?v=2"},
        {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in g['faq']]},
        {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://riside.com/"},{"@type":"ListItem","position":2,"name":"Guides","item":"https://riside.com/guides/"},{"@type":"ListItem","position":3,"name":g['title'],"item":url}]}]
    rel=''
    titles={}
    for r in g['related']:
        t=re.search(r'<h1>(.*?)</h1>',open('guides/%s/index.html'%r).read()).group(1)
        rel+='<li><a href="/guides/%s/">%s</a></li>'%(r,t)
    page=(h+'<script type="application/ld+json">'+json.dumps(ld)+'</script>\n'+style+body_open+
     '<p class="crumb"><a href="/">Home</a> / <a href="/guides/">Guides</a> / %s</p>\n<article><h1>%s</h1><p class="lede">%s</p>'%(e(g['title']),e(g['title']),g['lede'])+
     g['body']+'<h2>More guides</h2><ul class="related">%s<li><a href="/ai-classes/">Live AI classes by city</a></li></ul></article>'%rel+foot)
    os.makedirs('guides/'+g['slug'],exist_ok=True)
    open('guides/%s/index.html'%g['slug'],'w').write(page)
# guides index: add under Getting started
gi=open('guides/index.html').read()
add=''.join('<li><a href="/guides/%s/">%s<span>%s</span></a></li>'%(g['slug'],e(g['title']),e(g['desc'])) for g,_ in urls if '/guides/%s/'%g['slug'] not in gi)
if add:
    gi=gi.replace('<h2>Getting started</h2><ul class="grid">','<h2>Getting started</h2><ul class="grid">'+add,1); open('guides/index.html','w').write(gi)
# sitemap
sm=open('sitemap.xml').read()
for g,u in urls:
    if u not in sm:
        sm=sm.replace('</urlset>','  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>'%(u,TODAY))
open('sitemap.xml','w').write(sm)
print('done',len(urls))
