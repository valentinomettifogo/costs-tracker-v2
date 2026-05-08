<script lang="ts">
	import demoImg from '$lib/assets/demo.png';
</script>

<section class="hero rounded-2rem bg-base-100 p-6 shadow-sm md:p-12 lg:p-16 mb-16">
    <div class="hero-content flex-col gap-10 lg:flex-row w-full p-0">
        
        <div class="flex-1 flex flex-col gap-6 text-center lg:text-left">
            <h1 class="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
                Manage shared budgets, <span class="text-primary">effortlessly.</span>
            </h1>
            <p class="text-lg text-base-content/60 max-w-lg mx-auto lg:mx-0">
                Stop arguing about who paid for what. Track expenses with your group, organize your movements, and keep your finances healthy in one place.
            </p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mt-2 w-full max-w-xs mx-auto lg:mx-0">
                <a href="/login" class="btn btn-primary w-full sm:w-auto">Get Started</a>
                <a href="#features" class="btn btn-outline w-full sm:w-auto">Learn More</a>
            </div>
        </div>

        <div class="flex-1 flex justify-center lg:justify-end w-full">
            <div class="mockup-phone border-primary shadow-xl scale-75 origin-top">
                <div class="camera"></div> 
                <div class="display">
                    <div class="artboard artboard-demo phone-1 overflow-hidden rounded-[2.5rem]">
                        <img src={demoImg} alt="App demo screenshot" class="w-full h-full object-cover object-top" />
                    </div>
                </div>
            </div>
        </div>
        
    </div>
</section>

<section id="features" class="mb-16">
    <div class="text-center mb-10">
        <h2 class="text-3xl font-bold tracking-tight">Everything you need</h2>
        <p class="mt-2 text-base-content/60">Simple, fast, and built for everyday use.</p>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-100 hover:border-primary/20">
            <div class="card-body">
                <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                </div>
                <h3 class="card-title text-lg">Shared spaces</h3>
                <p class="text-sm text-base-content/60 mt-1">Invite your flatmates or partner and track expenses together. Settle up without the math.</p>
            </div>
        </div>

        <div class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-100 hover:border-primary/20">
            <div class="card-body">
                <div class="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-3 text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>
                </div>
                <h3 class="card-title text-lg">Categories & tags</h3>
                <p class="text-sm text-base-content/60 mt-1">Organise movements by type: needs, wants, income, savings. Keep your reports clean.</p>
            </div>
        </div>

        <div class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-100 hover:border-primary/20">
            <div class="card-body">
                <div class="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-3 text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                </div>
                <h3 class="card-title text-lg">Mobile-first</h3>
                <p class="text-sm text-base-content/60 mt-1">Designed for your phone. Add expenses in seconds, anywhere you are, directly at the checkout.</p>
            </div>
        </div>
    </div>
</section>

<section class="card bg-primary text-primary-content shadow-lg">
    <div class="card-body items-center text-center py-12 md:py-16">
        <h2 class="text-3xl md:text-4xl font-bold tracking-tight">Ready to take control?</h2>
        <p class="mt-3 text-primary-content/80 max-w-md">
            Join now and start managing your group finances without the headache.
        </p>
        <div class="mt-6">
            <a href="/login" class="btn btn-neutral btn-wide">Sign in now</a>
        </div>
    </div>
</section>