<script lang="ts">
    import { CreditCard, Users, Smartphone, BarChart3, ShieldCheck, Zap } from 'lucide-svelte';
</script>

<div class="mx-auto max-w-6xl px-4 py-12 md:py-20">
    <!-- Hero Section -->
    <section class="relative overflow-hidden rounded-3xl bg-white px-6 py-16 shadow-sm md:px-12 md:py-24 lg:px-16 mb-20 border border-gray-100">
        <div class="relative z-10 flex flex-col items-center gap-12 lg:flex-row">
            <div class="flex-1 text-center lg:text-left">
                <h1 class="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
                    Track your expenses <span class="text-primary">effortlessly</span>
                </h1>
                <p class="mx-auto mt-6 max-w-2xl text-lg text-gray-600 lg:mx-0">
                    The simple, beautiful way to manage shared costs and personal finances. 
                    Collaborate with roommates, partners, or track on your own.
                </p>
                <div class="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                    <a href="/login" class="btn btn-primary btn-lg px-8 py-4 text-base">Get Started</a>
                    <a href="#features" class="btn btn-outline btn-lg px-8 py-4 text-base">Learn More</a>
                </div>
            </div>
            <div class="flex-1">
                <div class="relative mx-auto max-w-md lg:max-w-none">
                    <div class="absolute -inset-4 rounded-full bg-primary/10 blur-3xl"></div>
                    <img src="/images/demo.png" alt="App Screenshot" class="relative rounded-2xl shadow-2xl border border-gray-200" />
                </div>
            </div>
        </div>
    </section>

    <!-- Features Grid -->
    <section id="features" class="mb-24">
        <div class="mb-12 text-center">
            <h2 class="text-3xl font-bold text-gray-900 md:text-4xl">Everything you need</h2>
            <p class="mt-4 text-gray-600">Powerful features to keep your finances in check.</p>
        </div>
        
        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
            <!-- Feature 1 -->
            <div class="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Users size={24} />
                </div>
                <h3 class="text-xl font-bold text-gray-900">Shared spaces</h3>
                <p class="mt-3 text-gray-600 leading-relaxed">
                    Create separate spaces for home, travel, or projects. Invite others and track shared expenses in real-time.
                </p>
            </div>

            <!-- Feature 2 -->
            <div class="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <CreditCard size={24} />
                </div>
                <h3 class="text-xl font-bold text-gray-900">Categories & tags</h3>
                <p class="mt-3 text-gray-600 leading-relaxed">
                    Organize your spending with custom categories and searchable tags. Know exactly where your money goes.
                </p>
            </div>

            <!-- Feature 3 -->
            <div class="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Smartphone size={24} />
                </div>
                <h3 class="text-xl font-bold text-gray-900">Mobile-first</h3>
                <p class="mt-3 text-gray-600 leading-relaxed">
                    Designed for the web but optimized for your phone. Add expenses on the go with our fast, PWA-ready interface.
                </p>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="rounded-3xl bg-primary px-6 py-16 text-center text-white shadow-xl md:py-20 lg:px-16">
        <div class="mx-auto max-w-3xl">
            <h2 class="text-3xl font-extrabold md:text-4xl">Ready to take control?</h2>
            <p class="mt-6 text-lg text-white/90">
                Join thousands of users who are already managing their costs smarter. 
                Start tracking for free today.
            </p>
            <div class="mt-10 flex justify-center">
                <a href="/login" class="btn bg-white text-primary hover:bg-gray-50 px-10 py-4 text-base font-bold shadow-lg">
                    Sign in now
                </a>
            </div>
        </div>
    </section>
</div>