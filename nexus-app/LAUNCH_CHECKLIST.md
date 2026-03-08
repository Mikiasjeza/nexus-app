# Launch Checklist

Use this checklist before launching Nexus to production.

## Pre-Launch

### Hard Gates (Block Release if Any Fail)
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm test -- --runInBand` passes
- [ ] `npm run build` passes
- [ ] `npm run launch:gate` passes
- [ ] `npx prisma migrate deploy` succeeds against production DB
- [ ] `/api/health` returns `status: ok` with `checks.database: up`
- [ ] `npm run health:verify` passes against production URL
- [ ] `npm run smoke:prod` passes against production URL

### Configuration
- [ ] All environment variables configured in production
- [ ] `GUEST_MODE` is unset or explicitly `false` in production
- [ ] Database connection configured (when backend is ready)
- [ ] API endpoints configured
- [ ] OAuth credentials set up (if using)
- [ ] Email service configured (SMTP, SendGrid, etc.)
- [ ] CDN configured for static assets
- [ ] Domain and DNS configured
- [ ] SSL/HTTPS certificate installed

### Security
- [ ] Security headers verified (CSP, HSTS, etc.)
- [ ] Rate limiting configured
- [ ] Input validation tested
- [ ] XSS protection verified
- [ ] CSRF protection enabled
- [ ] Password requirements enforced
- [ ] Authentication tokens secured
- [ ] Environment variables secured (no secrets in code)
- [ ] API keys rotated and secured
- [ ] Dependency vulnerabilities checked (`npm audit`)
- [ ] Security audit completed

### Performance
- [ ] Production build tested
- [ ] Image optimization verified
- [ ] Code splitting working
- [ ] Caching configured
- [ ] CDN configured
- [ ] Performance tested (Lighthouse score >90)
- [ ] Load testing completed
- [ ] Database queries optimized (when ready)

### Functionality
- [ ] All features tested
- [ ] Authentication flow tested
- [ ] Unauthenticated protected-route access redirects to `/auth/login`
- [ ] Skill CRUD operations tested
- [ ] Public sharing tested
- [ ] Stripe checkout, portal, webhook flow verified end-to-end
- [ ] AI analyze endpoint tested with configured provider key
- [ ] Email notifications tested (when ready)
- [ ] File uploads tested (when ready)
- [ ] Error handling tested
- [ ] Edge cases handled

### Content
- [ ] Privacy policy reviewed and accurate
- [ ] Terms of service reviewed and accurate
- [ ] About page content accurate
- [ ] Contact information updated
- [ ] All placeholder content replaced
- [ ] Legal compliance verified
- [ ] Cookie consent configured
- [ ] GDPR compliance verified (if applicable)

### SEO & Analytics
- [ ] Meta tags configured
- [ ] Open Graph tags configured
- [ ] Sitemap generated and submitted
- [ ] Robots.txt configured
- [ ] Analytics configured (Google Analytics, etc.)
- [ ] Search console configured
- [ ] Structured data added (if applicable)
- [ ] Social sharing previews tested

### Monitoring & Logging
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Application logging configured
- [ ] Health checks configured (`/api/health`)
- [ ] Uptime monitoring set up
- [ ] Performance monitoring set up
- [ ] Alerting configured
- [ ] Log retention policy set

### Backup & Recovery
- [ ] Database backup strategy in place
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure documented
- [ ] Data export functionality tested

### Documentation
- [ ] README.md updated
- [ ] API documentation complete
- [ ] Deployment guide complete
- [ ] Contributing guidelines (if open source)
- [ ] Changelog maintained
- [ ] Internal documentation updated

### Testing
- [ ] Unit tests written (when implemented)
- [ ] Integration tests written (when implemented)
- [ ] E2E tests written (when implemented)
- [ ] Manual testing completed
- [ ] Cross-browser testing completed
- [ ] Mobile testing completed
- [ ] Accessibility testing completed

### Compliance
- [ ] GDPR compliance (if applicable)
- [ ] CCPA compliance (if applicable)
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Cookie policy accessible
- [ ] Data processing agreements in place
- [ ] User data rights implemented

### Marketing
- [ ] Landing page optimized
- [ ] Social media accounts created
- [ ] Press kit prepared
- [ ] Launch announcement ready
- [ ] Email templates ready
- [ ] Marketing analytics configured

## Post-Launch

### Immediate
- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Check health endpoints
- [ ] Verify all features working
- [ ] Monitor user feedback
- [ ] Check analytics data

### First 24 Hours
- [ ] Review error rates
- [ ] Monitor server resources
- [ ] Check database performance
- [ ] Review user signups
- [ ] Monitor support channels
- [ ] Check social media mentions

### First Week
- [ ] Review user feedback
- [ ] Fix critical bugs
- [ ] Optimize based on analytics
- [ ] Plan improvements
- [ ] Review security logs
- [ ] Performance optimization

## Emergency Contacts

- **Technical Lead**: [Name] - [Email] - [Phone]
- **DevOps**: [Name] - [Email] - [Phone]
- **Security**: [Name] - [Email] - [Phone]
- **Support**: [Email] - [Phone]

## CLI Verification Commands

```bash
npm run launch:gate
npm run db:migrate:deploy
SMOKE_BASE_URL="https://your-domain.com" npm run health:verify
SMOKE_BASE_URL="https://your-domain.com" SMOKE_EMAIL="..." SMOKE_PASSWORD="..." SMOKE_RUN_AI=true SMOKE_RUN_STRIPE=true npm run smoke:prod
```

## Rollback Procedure

If critical issues are discovered:

1. Identify the issue severity
2. Notify team members
3. Access deployment platform
4. Revert to previous stable version
5. Restore database backup if needed
6. Verify system stability
7. Communicate with users if needed
8. Document incident and resolution

## Support Resources

- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./docs/API.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

---

**Last Updated**: 2024-01-10
**Version**: 1.0.0
