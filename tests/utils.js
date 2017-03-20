import should from 'should/as-function'
import Ajv from 'ajv'

const libFolder = `../${process.env.LIB_FOLDER}`

const { DefineError, schemaValidator } = require(`${libFolder}/utils`)

describe('Utils', function () {
  describe('DefineError(errorName)', function () {
    it('is a function', () => should(DefineError).be.a.Function())
    describe(`CustomError(message, extra) = DefineError(errorName)`, () => {
      it('is a function', () => should(DefineError('myerror')).be.a.Function())
      it('CustomError.name === errorName', () => {
        let CustomError = DefineError('myerror')
        should(CustomError.name).equal('myerror')
      })
      describe('e = CustomError(message, extra)', () => {
        it('is an instance of Error', () => {
          let CustomError = DefineError('myerror')
          let e = new CustomError()
          should(e).be.an.instanceOf(Error)
        })
        it('e.message === message', () => {
          let CustomError = DefineError('myerror')
          let e = new CustomError('my error message')
          should(e.message).equal('my error message')
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
