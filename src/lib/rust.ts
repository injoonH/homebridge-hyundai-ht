export interface Option<T> {
  /**
   * Returns `true` if the option is a `Some` value.
   * */
  isSome(): boolean

  /**
   * Returns `true` if the option is a `Some` and the value inside it matches a predicate.
   * */
  isSomeAnd(f: (val: T) => boolean): boolean

  /**
   * Returns `true` if the option is a `None` value.
   * */
  isNone(): boolean

  /**
   * Returns `true` if the option is a `None` or the value inside it matches a predicate.
   * */
  isNoneOr(f: (val: T) => boolean): boolean

  /**
   * Returns the contained `Some` value, consuming the `this` value.
   * */
  expect(msg: string): T

  /**
   * Returns the contained `Some` value, consuming the `this` value.
   * */
  unwrap(): T

  /**
   * Returns the contained `Some` value or a provided default.
   * */
  unwrapOr(def: T): T

  /**
   * Returns the contained `Some` value or computes it from a closure.
   * */
  unwrapOrElse(f: () => T): T

  /**
   * Maps an `Option<T>` to `Option<U>` by applying a function to
   * a contained value (if `Some`) or returns `None` (if `None`).
   * */
  map<U>(f: (val: T) => U): Option<U>

  /**
   * Calls a function with a reference to the contained value if `Some`.
   * */
  inspect(f: (val: T) => void): Option<T>

  /**
   * Returns the provided default result (if none),
   * or applies a function to the contained value (if any).
   * */
  mapOr<U>(def: U, f: (val: T) => U): U

  /**
   * Computes a default function result (if none),
   * or applies a different function to the contained value (if any).
   * */
  mapOrElse<U>(def: () => U, f: (val: T) => U): U

  /**
   * Transforms the `Option<T>` into a `Result<T, E>`,
   * mapping `Some(v)` to `Ok(v)` and `None` to `Err(err)`.
   * */
  okOr<E>(err: E): Result<T, E>

  /**
   * Transforms the `Option<T>` into a `Result<T, E>`,
   * mapping `Some(v)` to `Ok(v)` and `None` to `Err(err())`.
   */
  okOrElse<E>(err: () => E): Result<T, E>

  /**
   * Returns `None` if the option is `None`, otherwise returns `opt`.
   * */
  and<U>(opt: Option<U>): Option<U>

  /**
   * Returns `None` if the option is `None`,
   * otherwise calls `f` with the wrapped value and returns the result.
   */
  andThen<U>(f: (val: T) => Option<U>): Option<U>

  /**
   * Returns `None` if the option is `None`, otherwise calls `predicate`
   * with the wrapped value and returns:
   *
   * - `Some(t)` if `predicate` returns `true` (where `t` is the wrapped value), and
   * - `None` if `predicate` returns `false`.
   */
  filter(predicate: (val: T) => boolean): Option<T>

  /**
   * Returns the option if it contains a value, otherwise returns `opt`.
   * */
  or(opt: Option<T>): Option<T>

  /**
   * Returns the option if it contains a value,
   * otherwise calls `f` and returns the result.
   */
  orElse(f: () => Option<T>): Option<T>

  /**
   * Returns `Some` if exactly one of `self`, `opt` is `Some`, otherwise returns `None`.
   * */
  xor(opt: Option<T>): Option<T>
}

/**
 * Some value of type `T`.
 */
export function Some<T>(val: T): Option<T> {
  const self: Option<T> = {
    isSome: () => true,
    isSomeAnd: (f) => f(val),
    isNone: () => false,
    isNoneOr: (f) => f(val),
    expect: () => val,
    unwrap: () => val,
    unwrapOr: () => val,
    unwrapOrElse: () => val,
    map: (f) => Some(f(val)),
    inspect: (f) => {
      f(val)
      return self
    },
    mapOr: (_, f) => f(val),
    mapOrElse: (_, f) => f(val),
    okOr: () => Ok(val),
    okOrElse: () => Ok(val),
    and: (opt) => opt,
    andThen: (f) => f(val),
    filter: (predicate) => (predicate(val) ? Some(val) : None()),
    or: () => self,
    orElse: () => self,
    xor: (opt) => (opt.isNone() ? self : None()),
  }
  return self
}

/**
 * No value.
 */
export function None<T>(): Option<T> {
  const self: Option<T> = {
    isSome: () => false,
    isSomeAnd: () => false,
    isNone: () => true,
    isNoneOr: () => true,
    expect: (msg) => {
      throw new Error(msg)
    },
    unwrap: () => {
      throw new Error('called `Option.unwrap()` on a `None` value')
    },
    unwrapOr: (def) => def,
    unwrapOrElse: (f) => f(),
    map: () => None(),
    inspect: () => self,
    mapOr: (def) => def,
    mapOrElse: (def) => def(),
    okOr: (err) => Err(err),
    okOrElse: (err) => Err(err()),
    and: () => None(),
    andThen: () => None(),
    filter: () => self,
    or: (opt) => opt,
    orElse: (f) => f(),
    xor: (opt) => (opt.isSome() ? opt : None()),
  }
  return self
}

/**
 * `Result` is a type that represents either success (`Ok`) or failure (`Err`).
 */
export interface Result<T, E> {
  /**
   * Returns `true` if the result is `Ok`
   * */
  isOk(): boolean

  /**
   * Returns `true` if the result is `Ok` and the value inside it matches a predicate.
   * */
  isOkAnd(f: (val: T) => boolean): boolean

  /**
   * Returns `true` if the result is `Err`.
   * */
  isErr(): boolean

  /**
   * Returns `true` if the result is `Err` and the value inside it matches a predicate.
   * */
  isErrAnd(f: (err: E) => boolean): boolean

  /**
   * Converts from `Result<T, E>` to `Option<T>`.
   * */
  ok(): Option<T>

  /**
   * Converts from `Result<T, E>` to `Option<E>`.
   * */
  err(): Option<E>

  /**
   * Maps a `Result<T, E>` to `Result<U, E>` by applying a function to
   * a contained `Ok` value, leaving an `Err` value untouched.
   * */
  map<U>(f: (val: T) => U): Result<U, E>

  /**
   * Returns the provided default (if `Err`),
   * or applies a function to the contained value (if `Ok`).
   * */
  mapOr<U>(def: U, f: (val: T) => U): U

  /**
   * Maps a `Result<T, E>` to `U` by applying fallback function `def` to
   * a contained `Err` value, or function `f` to a contained `Ok` value.
   *
   * This function can be used to unpack a successful result
   * while handling an error.
   * */
  mapOrElse<U>(def: (err: E) => U, f: (val: T) => U): U

  /**
   * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a
   * contained `Err` value, leaving an `Ok` value untouched.
   * */
  mapErr<F>(f: (err: E) => F): Result<T, F>

  /**
   * Calls a function with a reference to the contained value if `Ok`.
   * */
  inspect(f: (val: T) => void): Result<T, E>

  /**
   * Calls a function with a reference to the contained value if `Err`.
   * */
  inspectErr(f: (err: E) => void): Result<T, E>

  /**
   * Returns the contained `Ok` value, consuming the `this` value.
   * */
  expect(msg: string): T

  /**
   * Returns the contained `Ok` value, consuming the `this` value.
   * */
  unwrap(): T

  /**
   * Returns the contained `Err` value, consuming the `this` value.
   * */
  expectErr(msg: string): E

  /**
   * Returns the contained `Err` value, consuming the `this` value.
   * */
  unwrapErr(): E

  /**
   * Returns `res` if the result is `Ok`, otherwise returns the `Err` value of `this`.
   * */
  and<U>(res: Result<U, E>): Result<U, E>

  /**
   * Calls `op` if the result is `Ok`, otherwise returns the `Err` value of `this`.
   * */
  andThen<U>(op: (val: T) => Result<U, E>): Result<U, E>

  /**
   * Returns `res` if the result is `Err`, otherwise returns the `Ok` value of `this`.
   * */
  or<F>(res: Result<T, F>): Result<T, F>

  /**
   * Calls `op` if the result is `Err`, otherwise returns the `Ok` value of `this`.
   * */
  orElse<F>(op: (err: E) => Result<T, F>): Result<T, F>

  /**
   * Returns the contained `Ok` value or a provided default.
   * */
  unwrapOr(def: T): T

  /**
   * Returns the contained `Ok` value or computes it from a closure.
   * */
  unwrapOrElse(op: (err: E) => T): T
}

/**
 * Contains the success value
 */
export function Ok<T, E>(val: T): Result<T, E> {
  const self: Result<T, E> = {
    isOk: () => true,
    isOkAnd: (f) => f(val),
    isErr: () => false,
    isErrAnd: () => false,
    ok: () => Some(val),
    err: () => None(),
    map: (f) => Ok(f(val)),
    mapOr: (_, f) => f(val),
    mapOrElse: (_, f) => f(val),
    mapErr: () => Ok(val),
    inspect: (f) => {
      f(val)
      return self
    },
    inspectErr: () => self,
    expect: () => val,
    unwrap: () => val,
    expectErr: (msg) => {
      throw new Error(`${msg}: ${val}`)
    },
    unwrapErr: () => {
      throw new Error(`called \`Result.unwrapErr()\` on an \`Ok\` value: ${val}`)
    },
    and: (res) => res,
    andThen: (op) => op(val),
    or: () => Ok(val),
    orElse: () => Ok(val),
    unwrapOr: () => val,
    unwrapOrElse: () => val,
  }
  return self
}

/**
 * Contains the error value
 */
export function Err<T, E>(err: E): Result<T, E> {
  const self: Result<T, E> = {
    isOk: () => false,
    isOkAnd: () => false,
    isErr: () => true,
    isErrAnd: (f) => f(err),
    ok: () => None(),
    err: () => Some(err),
    map: () => Err(err),
    mapOr: (def) => def,
    mapOrElse: (def) => def(err),
    mapErr: (f) => Err(f(err)),
    inspect: () => self,
    inspectErr: (f) => {
      f(err)
      return self
    },
    expect: (msg) => {
      throw new Error(`${msg}: ${err}`)
    },
    unwrap: () => {
      throw new Error(`called \`Result.unwrap()\` on an \`Err\` value: ${err}`)
    },
    expectErr: () => err,
    unwrapErr: () => err,
    and: () => Err(err),
    andThen: () => Err(err),
    or: (res) => res,
    orElse: (op) => op(err),
    unwrapOr: (def) => def,
    unwrapOrElse: (op) => op(err),
  }
  return self
}
