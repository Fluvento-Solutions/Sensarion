<template>
  <section class="flex flex-col gap-8">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in 4"
        :key="`primary-${card}`"
        class="skeleton-block aspect-[4/3] w-full"
        aria-hidden="true"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div class="grid gap-4 md:grid-cols-2">
        <div
          v-for="panel in 4"
          :key="`secondary-${panel}`"
          class="skeleton-block h-40 w-full"
          aria-hidden="true"
        />
      </div>

      <div class="grid gap-4">
        <div
          v-for="summary in 3"
          :key="`summary-${summary}`"
          class="skeleton-block h-32 w-full"
          aria-hidden="true"
        />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="tile in 6"
        :key="`tertiary-${tile}`"
        class="skeleton-block h-36 w-full"
        aria-hidden="true"
      />
    </div>
  </section>
</template>

