import should from 'should/as-function'
import Ajv from 'ajv'

const libFolder = `../${process.env.LIB_FOLDER}`

const { DefineError, schemaValidator } = require(`${libFolder}/utils`)

describe('Utils', function () {
  describe('DefineError(errorName, defaultMessage)', function () {
    it('is a function', () => should(DefineError).be.a.Function())
    describe(`CustomError(message[, extra]) = DefineError(errorName, defaultMessage)`, () => {
      it('is a function', () => should(DefineError('myerror')).be.a.Function())
      it('CustomError.name === errorName', () => {
        let CustomError = DefineError('myerror')
        should(CustomError.name).equal('myerror')
      })
      describe.only('e = CustomError(message[, extra])', () => {
        it('is an instance of Error', () => {
          let CustomError = DefineError('myerror')
          let e = new CustomError()
          should(e).be.an.instanceOf(Error)
        })
        it('e.message === message || e.message === defaultMessage', () => {
          let CustomError = DefineError('myerror')
          let e = new CustomError('my error message')
          should(e.message).equal('my error message')

          let AnotherCustomError = DefineError('myerror', 'a default message')
          let ae = new AnotherCustomError()
          should(ae.message).equal('a default message')
        })
        it('e.extra is undefined if not provided', () => {
          let CustomError = DefineError('myerror')
          let e = new CustomError('my error message')
          should(e.extra).be.undefined()
        })
        it('e.extra === extra', () => {
          let extra = {}
          let CustomError = DefineError('myerror')
          let e = new CustomError('my error message', extra)
          should(e.extra).equal(extra)
        })
      })
    })
  })
  describe('validator', function () {
    it('is an instance of Ajv (https://www.npmjs.com/package/ajv)', () => {
      should(schemaValidator).be.an.instanceOf(Ajv)
    })
  })
})
