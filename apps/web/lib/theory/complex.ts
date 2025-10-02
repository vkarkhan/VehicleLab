export type Complex = {
  re: number;
  im: number;
};

export const complex = (re: number, im: number = 0): Complex => ({ re, im });

export const add = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

export const sub = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im,
});

export const mul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const div = (a: Complex, b: Complex): Complex => {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) {
    throw new Error("Division by zero in complex division");
  }
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
};

export const conj = (c: Complex): Complex => ({ re: c.re, im: -c.im });

export const magnitude = (c: Complex): number => Math.sqrt(c.re * c.re + c.im * c.im);

export const phase = (c: Complex): number => Math.atan2(c.im, c.re);

export const scale = (c: Complex, scalar: number): Complex => ({ re: c.re * scalar, im: c.im * scalar });
