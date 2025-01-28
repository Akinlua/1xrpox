import math

primes = []

for num in range(2, 51):
    prime = True
    for i in range(2, int(math.sqrt(num)) + 1):
        if num % i == 0:
            prime = False
            break
        if prime:  # This should be outside the inner loop
            primes.append(num)

print(primes)
